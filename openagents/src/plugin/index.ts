/**
 * OpenAgents Plugin
 * 
 * Main plugin that loads agents from .md files and registers them with OpenCode.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { loadAgents, type AgentDefinition, type OpenCodeAgentConfig } from "../agents"
import { loadConfig, type OpenAgentsConfig, type AgentConfig } from "./config"
import { createTaskTracker } from "../features/task-tracker"
import { createContextManager } from "../features/context"
import { createUIManager } from "../features/ui"

const PLUGIN_NAME = "OpenAgents"
const PLUGIN_VERSION = "0.1.0"

/**
 * Convert AgentDefinition to OpenCode's AgentConfig format
 */
function toOpenCodeAgent(
  agent: AgentDefinition, 
  override?: AgentConfig,
  defaultModel?: string
): OpenCodeAgentConfig {
  // Build tools config
  let tools: Record<string, boolean> | undefined
  
  // Start with disabled tools from frontmatter
  if (agent.disabledTools) {
    tools = {}
    for (const tool of agent.disabledTools) {
      tools[tool] = false
    }
  }
  
  // Apply override tools
  if (override?.tools) {
    tools = { ...tools, ...override.tools }
  }
  
  return {
    description: override?.description ?? agent.description,
    model: override?.model ?? agent.model ?? defaultModel,
    mode: override?.mode ?? agent.mode ?? "subagent",
    temperature: override?.temperature ?? agent.temperature,
    maxTokens: override?.maxTokens ?? agent.maxTokens,
    prompt: agent.prompt,
    tools,
    color: agent.color,
  }
}

/**
 * OpenAgents Plugin
 */
const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Load config
  const config = loadConfig(directory)
  
  // Check if plugin is enabled
  if (!config.enabled) {
    console.log(`[${PLUGIN_NAME}] Plugin is disabled. Set "enabled": true in config to activate.`)
    return {
      config: async () => {}, // No-op
      event: async () => {}   // No-op
    }
  }
  
  // Create managers
  const taskTracker = createTaskTracker()
  const contextManager = createContextManager(directory)
  const uiManager = createUIManager(client)
  
  // Determine agent directories to load from
  const agentDirs = [
    join(directory, ".openagents", config.agents_dir),
    join(directory, ".openagents", "agents"),
  ]
  
  // Load all agents from directories
  const agentMap = loadAgents(agentDirs)
  
  // Also load agents specified directly in config
  if (config.agents) {
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      if (agentConfig.file) {
        const filePath = join(directory, ".openagents", agentConfig.file)
        const { loadAgentFromFile } = await import("../agents/loader")
        const agent = loadAgentFromFile(filePath)
        if (agent) {
          agent.name = name // Use config key as name
          agentMap.set(name, agent)
        }
      }
    }
  }
  
  // Filter out disabled agents
  const disabledSet = new Set(config.disabled_agents ?? [])
  for (const name of disabledSet) {
    agentMap.delete(name)
  }
  
  // Also filter by enabled: false in agent config
  if (config.agents) {
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      if (agentConfig.enabled === false) {
        agentMap.delete(name)
      }
    }
  }
  
  console.log(`[OpenAgents] Loaded ${agentMap.size} agents: ${[...agentMap.keys()].join(", ")}`)
  
  const agentNames = [...agentMap.keys()]
  console.log(`[${PLUGIN_NAME}] Loaded ${agentMap.size} agents: ${agentNames.join(", ")}`)
  
  return {
    /**
     * Register agents with OpenCode
     */
    config: async (openCodeConfig) => {
      const agents: Record<string, OpenCodeAgentConfig> = {}
      
      for (const [name, agent] of agentMap) {
        const override = config.agents?.[name]
        const agentConfig = toOpenCodeAgent(agent, override, config.default_model)
        
        // Determine prefix based on agent mode
        let prefix = ""
        if (config.add_prefix) {
          // Check for custom prefix first
          if (override?.prefix) {
            prefix = override.prefix
          } else {
            // Use mode-based prefix
            const mode = override?.mode ?? agent.mode ?? "subagent"
            prefix = mode === "primary" ? config.primary_prefix : config.subagent_prefix
          }
        }
        
        // Add prefix to description if enabled
        if (prefix && agentConfig.description) {
          agentConfig.description = `${prefix} ${agentConfig.description}`
        }
        
        // Use prefixed name as key
        const agentKey = prefix ? `${prefix} ${name}` : name
        agents[agentKey] = agentConfig
      }
      
      // Merge with existing agents (our agents can be overridden)
      openCodeConfig.agent = {
        ...agents,
        ...openCodeConfig.agent,
      } as typeof openCodeConfig.agent
      
      console.log(`[${PLUGIN_NAME}] Registered agents: ${Object.keys(agents).join(", ")}`)
    },
    
    /**
     * Handle lifecycle events
     */
    event: async (input) => {
      const { event } = input
      
      // Session created - track task start
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string; agent?: string } } | undefined
        
        // Only track subagent sessions (have parentID)
        if (props?.info?.parentID && props?.info?.agent) {
          const sessionID = (event.properties as any).sessionID
          const agent = props.info.agent
          
          taskTracker.start(agent, sessionID)
          await uiManager.showStart(agent)
        }
        
        // Show toast on main session created
        if (!props?.info?.parentID && config.show_version_popup) {
          const agentCount = agentMap.size
          
          // Build agent list with appropriate prefixes
          const agentList = agentNames.map(name => {
            if (!config.add_prefix) return name
            
            const override = config.agents?.[name]
            const agent = agentMap.get(name)
            
            // Custom prefix
            if (override?.prefix) {
              return `${override.prefix} ${name}`
            }
            
            // Mode-based prefix
            const mode = override?.mode ?? agent?.mode ?? "subagent"
            const prefix = mode === "primary" ? config.primary_prefix : config.subagent_prefix
            return `${prefix} ${name}`
          }).join(", ")
          
          const message = agentCount > 0
            ? `✅ Active with ${agentCount} agent${agentCount > 1 ? 's' : ''}\n📦 Agents: ${agentList}\n🔧 Context tracking enabled\n👁️ Default visibility: ${config.default_visible_to.join(", ")}`
            : "⚠️ No agents found"
          
          try {
            const tuiClient = client as any
            if (tuiClient.tui?.showToast) {
              await tuiClient.tui.showToast({
                body: {
                  title: `${PLUGIN_NAME} v${PLUGIN_VERSION}`,
                  message,
                  variant: agentCount > 0 ? "success" : "warning",
                  duration: 8000 // Show for 8 seconds
                }
              })
            }
          } catch (error) {
            console.error(`[${PLUGIN_NAME}] Toast failed:`, error)
          }
        }
      }
      
      // Session idle - track task complete
      if (event.type === "session.idle") {
        const sessionID = (event.properties as any).sessionID
        const task = taskTracker.complete(sessionID)
        
        if (task) {
          const duration = taskTracker.getDuration(task)
          await uiManager.showComplete(task.agent, duration)
        }
      }
      
      // Session error - track task error
      if (event.type === "session.error") {
        const sessionID = (event.properties as any).sessionID
        const error = (event.properties as any).error?.message || "Unknown error"
        const task = taskTracker.error(sessionID, error)
        
        if (task) {
          await uiManager.showError(task.agent, error)
        }
      }
    }
  }
}

console.log(`✅ ${PLUGIN_NAME} v${PLUGIN_VERSION} loaded`)

export default OpenAgentsPlugin
export { loadConfig, OpenAgentsConfigSchema } from "./config"
export type { OpenAgentsConfig, AgentConfig } from "./config"

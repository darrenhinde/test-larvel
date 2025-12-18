/**
 * OpenAgents
 * 
 * An open repository for building and sharing agents for OpenCode.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { loadAgents } from "./agents/loader"
import { loadConfig } from "./plugin/config"

const PLUGIN_NAME = "OpenAgents"
const PLUGIN_VERSION = "0.1.0"

const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Load config
  const config = loadConfig(directory)
  
  // Determine agent directories to load from
  const agentDirs = [
    join(directory, ".openagents", config.agents_dir),
    join(directory, ".openagents", "agents"),
  ]
  
  // Load all agents from directories
  const agentMap = loadAgents(agentDirs)
  
  // Filter out disabled agents
  const disabledSet = new Set(config.disabled_agents ?? [])
  for (const name of disabledSet) {
    agentMap.delete(name)
  }
  
  // Filter by enabled: false in agent config
  if (config.agents) {
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      if (agentConfig.enabled === false) {
        agentMap.delete(name)
      }
    }
  }
  
  const agentNames = [...agentMap.keys()]
  console.log(`[${PLUGIN_NAME}] Loaded ${agentMap.size} agents: ${agentNames.join(", ")}`)
  
  return {
    /**
     * Register agents with OpenCode
     */
    config: async (openCodeConfig) => {
      const agents: Record<string, any> = {}
      
      for (const [name, agent] of agentMap) {
        const override = config.agents?.[name]
        
        // Build tools config if there are disabled tools
        let tools: Record<string, boolean> | undefined
        if (agent.disabledTools) {
          tools = {}
          for (const tool of agent.disabledTools) {
            tools[tool] = false
          }
        }
        if (override?.tools) {
          tools = { ...tools, ...override.tools }
        }
        
        agents[name] = {
          description: override?.description ?? agent.description,
          model: override?.model ?? agent.model ?? config.default_model,
          mode: override?.mode ?? agent.mode ?? "subagent",
          temperature: override?.temperature ?? agent.temperature,
          maxTokens: override?.maxTokens ?? agent.maxTokens,
          prompt: agent.prompt,
          tools,
          color: agent.color,
        }
      }
      
      // Merge with existing agents (ours first, so they can be overridden)
      openCodeConfig.agent = {
        ...agents,
        ...openCodeConfig.agent,
      } as typeof openCodeConfig.agent
      
      console.log(`[${PLUGIN_NAME}] Registered agents: ${Object.keys(agents).join(", ")}`)
    },
    
    /**
     * Handle lifecycle events - show toast on session created
     */
    event: async (input) => {
      const { event } = input
      
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string } } | undefined
        
        // Only show toast for main sessions (not child/background sessions)
        if (!props?.info?.parentID) {
          const agentCount = agentMap.size
          const message = agentCount > 0 
            ? `Loaded ${agentCount} agents: ${agentNames.join(", ")}`
            : "No agents found in .openagents/agents/"
          
          await client.tui.showToast({
            body: {
              title: `${PLUGIN_NAME} v${PLUGIN_VERSION}`,
              message,
              variant: agentCount > 0 ? "success" : "warning",
            }
          }).catch(() => {
            // Silently fail if toast cannot be shown
          })
        }
      }
    }
  }
}

// Log when plugin module is loaded
console.log(`✅ ${PLUGIN_NAME} v${PLUGIN_VERSION} loaded`)

export default OpenAgentsPlugin

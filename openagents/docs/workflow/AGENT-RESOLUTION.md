# Agent Resolution Strategy

## Problem

Workflows need to reference agents from multiple sources:

1. **OpenAgents Agents** - Defined in `.openagents/agents/*.md` files
2. **OpenCode Built-in Agents** - Already registered in OpenCode (e.g., `plan`, `build`, `test`)
3. **Other Plugin Agents** - Registered by other OpenCode plugins
4. **Global Agents** - Future: User's global agent library

We don't know which file an agent comes from, or even if it comes from a file at all.

## Solution: Unified Agent Registry

Create a unified registry that can resolve agents from any source.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Agent Registry                    │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  OpenAgents    │  │  OpenCode      │  │  Other       │  │
│  │  Agents        │  │  Built-in      │  │  Plugins     │  │
│  │  (.md files)   │  │  Agents        │  │  Agents      │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│         │                    │                   │          │
│         └────────────────────┼───────────────────┘          │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │  Agent Resolver  │                     │
│                    │  - Check local   │                     │
│                    │  - Check OpenCode│                     │
│                    │  - Check plugins │                     │
│                    └──────────────────┘                     │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │ AgentExecutor    │                     │
│                    │ - Execute agent  │                     │
│                    │ - Any source     │                     │
│                    └──────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Agent Source Types

```typescript
/**
 * Agent source - where the agent comes from
 */
export type AgentSource = 
  | "openagents"    // From .openagents/agents/*.md
  | "opencode"      // OpenCode built-in agent
  | "plugin"        // From another plugin
  | "global"        // From global agent library

/**
 * Resolved agent - agent with source information
 */
export interface ResolvedAgent {
  name: string
  source: AgentSource
  
  // For OpenAgents agents
  definition?: AgentDefinition
  
  // For OpenCode agents
  registered?: boolean
  
  // Metadata
  description?: string
  model?: string
  mode?: "primary" | "subagent"
}
```

### 2. Unified Agent Resolver

Create `src/workflow/agent-resolver.ts`:

```typescript
/**
 * Agent Resolver
 * 
 * Resolves agents from multiple sources:
 * - OpenAgents (.md files)
 * - OpenCode built-in agents
 * - Other plugins
 */

import type { AgentDefinition } from "../agents/types"
import type { OpenCodeClient } from "@opencode-ai/plugin"

export type AgentSource = "openagents" | "opencode" | "plugin" | "global"

export interface ResolvedAgent {
  name: string
  source: AgentSource
  definition?: AgentDefinition
  registered?: boolean
  description?: string
  model?: string
  mode?: "primary" | "subagent"
}

export class AgentResolver {
  private openAgentsMap: Map<string, AgentDefinition>
  private openCodeAgents: Set<string>
  private client: OpenCodeClient

  constructor(
    openAgentsMap: Map<string, AgentDefinition>,
    client: OpenCodeClient
  ) {
    this.openAgentsMap = openAgentsMap
    this.openCodeAgents = new Set()
    this.client = client
  }

  /**
   * Register OpenCode built-in agents
   * Call this after OpenCode config is loaded
   */
  registerOpenCodeAgents(agentNames: string[]): void {
    for (const name of agentNames) {
      this.openCodeAgents.add(name)
    }
  }

  /**
   * Resolve agent from any source
   */
  resolve(agentName: string): ResolvedAgent | null {
    // 1. Check OpenAgents first (highest priority)
    const openAgent = this.openAgentsMap.get(agentName)
    if (openAgent) {
      return {
        name: agentName,
        source: "openagents",
        definition: openAgent,
        description: openAgent.description,
        model: openAgent.model,
        mode: openAgent.mode,
      }
    }

    // 2. Check OpenCode built-in agents
    if (this.openCodeAgents.has(agentName)) {
      return {
        name: agentName,
        source: "opencode",
        registered: true,
      }
    }

    // 3. Agent not found
    return null
  }

  /**
   * Check if agent exists (any source)
   */
  hasAgent(agentName: string): boolean {
    return this.resolve(agentName) !== null
  }

  /**
   * Get all available agents
   */
  getAllAgents(): ResolvedAgent[] {
    const agents: ResolvedAgent[] = []

    // Add OpenAgents
    for (const [name, definition] of this.openAgentsMap) {
      agents.push({
        name,
        source: "openagents",
        definition,
        description: definition.description,
        model: definition.model,
        mode: definition.mode,
      })
    }

    // Add OpenCode agents (that aren't already in OpenAgents)
    for (const name of this.openCodeAgents) {
      if (!this.openAgentsMap.has(name)) {
        agents.push({
          name,
          source: "opencode",
          registered: true,
        })
      }
    }

    return agents
  }

  /**
   * Get agents by source
   */
  getAgentsBySource(source: AgentSource): ResolvedAgent[] {
    return this.getAllAgents().filter(a => a.source === source)
  }

  /**
   * List all agent names
   */
  listAgentNames(): string[] {
    const names = new Set<string>()
    
    // Add OpenAgents
    for (const name of this.openAgentsMap.keys()) {
      names.add(name)
    }
    
    // Add OpenCode agents
    for (const name of this.openCodeAgents) {
      names.add(name)
    }
    
    return Array.from(names).sort()
  }
}
```

### 3. Updated AgentExecutor

Update `src/workflow/opencode-agent-executor.ts`:

```typescript
/**
 * OpenCode Agent Executor
 * 
 * Executes agents from any source (OpenAgents, OpenCode, plugins).
 */

import type { AgentExecutor } from "./types"
import type { OpenCodeClient } from "@opencode-ai/plugin"
import { AgentResolver, type ResolvedAgent } from "./agent-resolver"

export class OpenCodeAgentExecutor implements AgentExecutor {
  private resolver: AgentResolver
  private client: OpenCodeClient

  constructor(resolver: AgentResolver, client: OpenCodeClient) {
    this.resolver = resolver
    this.client = client
  }

  /**
   * Execute agent from any source
   */
  async execute(agentName: string, input: any): Promise<any> {
    // Resolve agent
    const agent = this.resolver.resolve(agentName)
    if (!agent) {
      const available = this.resolver.listAgentNames().join(", ")
      throw new Error(
        `Agent '${agentName}' not found. Available agents: ${available}`
      )
    }

    // Format input
    const agentInput = this.formatAgentInput(input)

    // Execute based on source
    switch (agent.source) {
      case "openagents":
        return this.executeOpenAgentsAgent(agent, agentInput)
      
      case "opencode":
        return this.executeOpenCodeAgent(agent, agentInput)
      
      default:
        throw new Error(`Unsupported agent source: ${agent.source}`)
    }
  }

  /**
   * Execute OpenAgents agent (from .md file)
   */
  private async executeOpenAgentsAgent(
    agent: ResolvedAgent,
    input: string
  ): Promise<any> {
    if (!agent.definition) {
      throw new Error(`Agent '${agent.name}' has no definition`)
    }

    // Use OpenCode's task tool to execute as subagent
    // This assumes OpenAgents has already registered the agent with OpenCode
    try {
      const result = await this.client.task({
        subagent_type: agent.name,
        prompt: input,
        description: `Execute ${agent.name} agent`,
      })

      return this.parseAgentResponse(result)
    } catch (error) {
      throw new Error(
        `OpenAgents agent '${agent.name}' failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Execute OpenCode built-in agent
   */
  private async executeOpenCodeAgent(
    agent: ResolvedAgent,
    input: string
  ): Promise<any> {
    // Use OpenCode's task tool to execute built-in agent
    try {
      const result = await this.client.task({
        subagent_type: agent.name,
        prompt: input,
        description: `Execute ${agent.name} agent`,
      })

      return this.parseAgentResponse(result)
    } catch (error) {
      throw new Error(
        `OpenCode agent '${agent.name}' failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Format workflow input for agent
   */
  private formatAgentInput(input: any): string {
    if (typeof input === "string") {
      return input
    }

    const parts: string[] = []

    // Add original input
    if (input.input) {
      parts.push("## Task")
      if (typeof input.input === "string") {
        parts.push(input.input)
      } else {
        parts.push(JSON.stringify(input.input, null, 2))
      }
    }

    // Add context from previous steps
    if (input.context && Object.keys(input.context).length > 0) {
      parts.push("\n## Context from Previous Steps")
      for (const [stepId, result] of Object.entries(input.context)) {
        parts.push(`\n### ${stepId}`)
        parts.push(JSON.stringify(result, null, 2))
      }
    }

    // Add explicit references
    for (const [key, value] of Object.entries(input)) {
      if (key !== "input" && key !== "context") {
        parts.push(`\n## ${key}`)
        parts.push(JSON.stringify(value, null, 2))
      }
    }

    return parts.join("\n")
  }

  /**
   * Parse agent response
   * 
   * Agents may return different formats, normalize them
   */
  private parseAgentResponse(response: any): any {
    // If response is already structured, return as-is
    if (response && typeof response === "object") {
      return response
    }

    // If response is a string, wrap it
    if (typeof response === "string") {
      return { result: response }
    }

    return response
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): string[] {
    return this.resolver.listAgentNames()
  }

  /**
   * Check if agent exists
   */
  hasAgent(name: string): boolean {
    return this.resolver.hasAgent(name)
  }

  /**
   * Get agent info
   */
  getAgentInfo(name: string): ResolvedAgent | null {
    return this.resolver.resolve(name)
  }
}
```

### 4. Updated Plugin Integration

Update `src/index.ts`:

```typescript
import type { Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { loadAgents } from "./agents/loader"
import { loadConfig } from "./plugin/config"
import { WorkflowExecutor, AgentStepExecutor } from "./workflow"
import { AgentResolver } from "./workflow/agent-resolver"
import { OpenCodeAgentExecutor } from "./workflow/opencode-agent-executor"
import { OpenCodeUIManager } from "./workflow/opencode-ui-manager"

const PLUGIN_NAME = "OpenAgents"
const PLUGIN_VERSION = "0.1.0"

const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Load config
  const config = loadConfig(directory)
  
  // Load OpenAgents agents
  const agentDirs = [
    join(directory, ".openagents", config.agents_dir),
    join(directory, ".openagents", "agents"),
  ]
  const agentMap = loadAgents(agentDirs)
  
  // Filter disabled agents
  const disabledSet = new Set(config.disabled_agents ?? [])
  for (const name of disabledSet) {
    agentMap.delete(name)
  }
  
  if (config.agents) {
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      if (agentConfig.enabled === false) {
        agentMap.delete(name)
      }
    }
  }
  
  console.log(`[${PLUGIN_NAME}] Loaded ${agentMap.size} OpenAgents agents`)
  
  // Create agent resolver
  const resolver = new AgentResolver(agentMap, client)
  
  // Create workflow system components
  const agentExecutor = new OpenCodeAgentExecutor(resolver, client)
  const uiManager = new OpenCodeUIManager(client)
  
  const workflowExecutor = new WorkflowExecutor({
    agentExecutor,
    uiManager,
  })
  
  // Register agent step executor
  workflowExecutor.registerExecutor("agent", new AgentStepExecutor(agentExecutor))
  
  return {
    config: async (openCodeConfig) => {
      // Build agents object for OpenCode
      const agents: Record<string, any> = {}
      
      for (const [name, agent] of agentMap) {
        const override = config.agents?.[name]
        
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
      
      // Register OpenCode's built-in agents with resolver
      // This happens AFTER merge, so we know all registered agents
      const allAgentNames = Object.keys(openCodeConfig.agent || {})
      resolver.registerOpenCodeAgents(allAgentNames)
      
      console.log(`[${PLUGIN_NAME}] Total agents available: ${allAgentNames.length}`)
      console.log(`[${PLUGIN_NAME}] - OpenAgents: ${agentMap.size}`)
      console.log(`[${PLUGIN_NAME}] - OpenCode: ${allAgentNames.length - agentMap.size}`)
    },
    
    event: async (input) => {
      const { event } = input
      
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string } } | undefined
        
        if (!props?.info?.parentID) {
          const allAgents = resolver.listAgentNames()
          const message = `Loaded ${allAgents.length} agents (${agentMap.size} OpenAgents + ${allAgents.length - agentMap.size} OpenCode)`
          
          await client.tui.showToast({
            body: {
              title: `${PLUGIN_NAME} v${PLUGIN_VERSION}`,
              message,
              variant: "success",
            }
          }).catch(() => {})
        }
      }
    },
    
    api: {
      workflowExecutor,
      agentExecutor,
      resolver,
    }
  }
}

export default OpenAgentsPlugin
```

## Usage Examples

### Example 1: Mixed Agent Sources

```typescript
const workflow: WorkflowDefinition = {
  id: "mixed-workflow",
  description: "Uses both OpenAgents and OpenCode agents",
  steps: [
    // OpenCode built-in agent
    {
      id: "plan",
      type: "agent",
      agent: "plan",              // OpenCode's built-in plan agent
      next: "custom-analyze"
    },
    
    // OpenAgents custom agent
    {
      id: "custom-analyze",
      type: "agent",
      agent: "analyzer",          // From .openagents/agents/analyzer.md
      input: "plan",
      next: "build"
    },
    
    // OpenCode built-in agent
    {
      id: "build",
      type: "agent",
      agent: "build",             // OpenCode's built-in build agent
      input: "custom-analyze",
      next: "custom-test"
    },
    
    // OpenAgents custom agent
    {
      id: "custom-test",
      type: "agent",
      agent: "tester",            // From .openagents/agents/tester.md
      next: "review"
    },
    
    // OpenCode built-in agent
    {
      id: "review",
      type: "agent",
      agent: "review"             // OpenCode's built-in review agent
    }
  ]
}
```

### Example 2: List Available Agents

```typescript
// Get all agents
const allAgents = resolver.getAllAgents()

console.log("Available agents:")
for (const agent of allAgents) {
  console.log(`- ${agent.name} (${agent.source})`)
  if (agent.description) {
    console.log(`  ${agent.description}`)
  }
}

// Output:
// Available agents:
// - plan (opencode)
// - build (opencode)
// - test (opencode)
// - review (opencode)
// - planner (openagents)
//   A helpful planning agent
// - coder (openagents)
//   Implements features based on plans
// - tester (openagents)
//   Runs tests and reports results
```

### Example 3: Check Agent Source

```typescript
const agent = resolver.resolve("planner")

if (agent) {
  console.log(`Agent: ${agent.name}`)
  console.log(`Source: ${agent.source}`)
  
  if (agent.source === "openagents") {
    console.log(`File: ${agent.definition?.path}`)
    console.log(`Model: ${agent.model}`)
  } else if (agent.source === "opencode") {
    console.log("Built-in OpenCode agent")
  }
}
```

## Agent Priority

When multiple sources define the same agent name:

1. **OpenAgents** (highest priority) - `.openagents/agents/*.md`
2. **OpenCode** - Built-in agents
3. **Plugins** - Other plugin agents

This allows you to **override** OpenCode's built-in agents with custom versions.

### Example: Override OpenCode's `plan` Agent

Create `.openagents/agents/plan.md`:

```markdown
---
description: "Custom planning agent with project-specific knowledge"
model: "anthropic/claude-opus-4"
mode: "subagent"
temperature: 0.7
---

You are a custom planning agent for this project.

You have deep knowledge of:
- Our architecture patterns
- Our coding standards
- Our testing requirements

When planning features, always consider...
```

Now workflows using `agent: "plan"` will use your custom version instead of OpenCode's built-in.

## Configuration

### Workflow Config

```json
{
  "id": "my-workflow",
  "description": "Uses mixed agents",
  "steps": [
    {
      "id": "step1",
      "type": "agent",
      "agent": "plan"           // Will resolve to best match
    }
  ]
}
```

### Agent Config

Control which agents are available:

```json
{
  "disabled_agents": ["old-planner"],
  "agents": {
    "plan": {
      "enabled": false        // Disable OpenAgents override, use OpenCode's
    },
    "custom-analyzer": {
      "enabled": true,
      "model": "anthropic/claude-opus-4"
    }
  }
}
```

## Troubleshooting

### Agent Not Found

```
Error: Agent 'myagent' not found. Available agents: plan, build, test, planner, coder
```

**Solutions:**
1. Check spelling
2. List available agents: `resolver.listAgentNames()`
3. Check if agent is disabled in config
4. Verify agent file exists (for OpenAgents)

### Wrong Agent Executed

If OpenCode's `plan` is executing instead of your custom `plan.md`:

**Check:**
1. File exists: `.openagents/agents/plan.md`
2. Agent is loaded: Check plugin logs
3. Agent is not disabled: Check config
4. Plugin config runs before OpenCode config

## Summary

- ✅ Unified resolver for all agent sources
- ✅ Supports OpenAgents (.md files)
- ✅ Supports OpenCode built-in agents
- ✅ Priority system (OpenAgents > OpenCode)
- ✅ Can override built-in agents
- ✅ Transparent to workflows
- ✅ Easy to extend for new sources

Workflows can now reference **any** agent without knowing where it comes from!

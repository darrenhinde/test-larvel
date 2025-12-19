/**
 * Agent Resolver
 * 
 * Resolves agents from multiple sources:
 * - OpenAgents (.md files)
 * - OpenCode built-in agents
 * - Other plugins
 */

import type { AgentDefinition } from "../agents/types"
import type { OpencodeClient } from "@opencode-ai/sdk"

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

  constructor(
    openAgentsMap: Map<string, AgentDefinition>,
    _client: OpencodeClient  // Reserved for future use (e.g., querying available agents)
  ) {
    this.openAgentsMap = openAgentsMap
    this.openCodeAgents = new Set()
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

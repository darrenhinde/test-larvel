/**
 * Visibility Manager
 * 
 * Controls which agents can see which subagents.
 */

import type { AgentConfig } from "../plugin/config"

/**
 * Check if an agent should be visible to a caller
 */
export function isVisibleTo(
  agentName: string,
  callerAgent: string | undefined,
  agentConfig: AgentConfig | undefined,
  defaultVisibleTo: string[] = ["*"]
): boolean {
  // If no caller specified, assume visible (for backwards compatibility)
  if (!callerAgent) {
    return true
  }
  
  // Get visibility list (use agent config, or fall back to default)
  const visibleTo = agentConfig?.visible_to ?? defaultVisibleTo
  
  // Check for wildcard
  if (visibleTo.includes("*")) {
    return true
  }
  
  // Check if caller is in the list
  return visibleTo.includes(callerAgent)
}

/**
 * Filter agents based on caller visibility
 */
export function filterAgentsByCaller(
  agents: Record<string, any>,
  callerAgent: string | undefined,
  agentConfigs: Record<string, AgentConfig> | undefined,
  defaultVisibleTo: string[] = ["*"]
): Record<string, any> {
  if (!callerAgent || !agentConfigs) {
    return agents
  }
  
  const filtered: Record<string, any> = {}
  
  for (const [name, agent] of Object.entries(agents)) {
    // Remove prefix if present for config lookup
    const cleanName = name.replace(/^\(Open(?:Sub)?\)\s+/, "")
    const config = agentConfigs[cleanName]
    
    if (isVisibleTo(cleanName, callerAgent, config, defaultVisibleTo)) {
      filtered[name] = agent
    }
  }
  
  return filtered
}

/**
 * Get list of agents visible to a caller
 */
export function getVisibleAgents(
  allAgents: string[],
  callerAgent: string | undefined,
  agentConfigs: Record<string, AgentConfig> | undefined,
  defaultVisibleTo: string[] = ["*"]
): string[] {
  if (!callerAgent || !agentConfigs) {
    return allAgents
  }
  
  return allAgents.filter(name => {
    const cleanName = name.replace(/^\(Open(?:Sub)?\)\s+/, "")
    const config = agentConfigs[cleanName]
    return isVisibleTo(cleanName, callerAgent, config, defaultVisibleTo)
  })
}

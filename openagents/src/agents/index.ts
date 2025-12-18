/**
 * Agents Module
 * 
 * Exports agent loading utilities and types.
 */

export { loadAgentFromFile, loadAgentsFromDirectory, loadAgents } from "./loader"
export type { 
  AgentDefinition, 
  AgentFrontmatter, 
  AgentConfigOverride,
  OpenCodeAgentConfig 
} from "./types"

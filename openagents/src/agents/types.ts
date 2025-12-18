/**
 * Agent Types
 * 
 * Type definitions for OpenAgents agent system.
 */

/**
 * Frontmatter fields that can be defined in agent .md files
 */
export interface AgentFrontmatter {
  description?: string
  model?: string
  mode?: "primary" | "subagent"
  temperature?: number
  maxTokens?: number
  tools?: string[]
  disabledTools?: string[]
  color?: string
}

/**
 * Full agent definition (frontmatter + prompt)
 */
export interface AgentDefinition extends AgentFrontmatter {
  name: string
  path: string
  prompt: string
}

/**
 * Agent config from config.json
 * Allows overriding agent settings without modifying the .md file
 */
export interface AgentConfigOverride {
  /** Path to agent .md file (relative to config) */
  file?: string
  /** Override model */
  model?: string
  /** Override mode */
  mode?: "primary" | "subagent"
  /** Enable async execution */
  async?: boolean
  /** Override temperature */
  temperature?: number
  /** Override max tokens */
  maxTokens?: number
  /** Enable/disable agent */
  enabled?: boolean
  /** Override description */
  description?: string
  /** Tools to enable */
  tools?: Record<string, boolean>
}

/**
 * OpenCode AgentConfig format
 */
export interface OpenCodeAgentConfig {
  description?: string
  model?: string
  mode?: "primary" | "subagent"
  temperature?: number
  maxTokens?: number
  prompt: string
  tools?: Record<string, boolean>
  color?: string
}

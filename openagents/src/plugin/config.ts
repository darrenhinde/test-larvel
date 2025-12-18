/**
 * OpenAgents Configuration
 * 
 * Simple config for loading and configuring agents.
 */

import { z } from "zod"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Agent config override schema
 */
const AgentConfigSchema = z.object({
  /** Path to agent .md file */
  file: z.string().optional(),
  /** Model to use */
  model: z.string().optional(),
  /** Agent mode */
  mode: z.enum(["primary", "subagent"]).optional(),
  /** Enable async execution */
  async: z.boolean().optional(),
  /** Suitable for parallel execution */
  parallel: z.boolean().optional(),
  /** Max parallel instances */
  parallel_limit: z.number().positive().optional(),
  /** Temperature */
  temperature: z.number().min(0).max(2).optional(),
  /** Max tokens */
  maxTokens: z.number().positive().optional(),
  /** Enable/disable agent */
  enabled: z.boolean().optional(),
  /** Description override */
  description: z.string().optional(),
  /** Tool overrides */
  tools: z.record(z.boolean()).optional(),
  /** Disabled tools */
  disabled_tools: z.array(z.string()).optional(),
  /** Which agents can see this agent (default: ["plan", "build"]) */
  visible_to: z.array(z.string()).optional(),
  /** Custom prefix for this agent (overrides default) */
  prefix: z.string().optional(),
})

/**
 * Main config schema
 */
export const OpenAgentsConfigSchema = z.object({
  /** Schema URL for IDE support */
  $schema: z.string().optional(),
  
  /** Enable/disable the plugin (opt-in approach) */
  enabled: z.boolean().default(false),
  
  /** Directory containing agent .md files */
  agents_dir: z.string().default("./agents"),
  
  /** Default model for all agents */
  default_model: z.string().default("opencode/big-pickle"),
  
  /** Directory for context files */
  context_dir: z.string().default("./.openagents/context"),
  
  /** Add prefix to agent names */
  add_prefix: z.boolean().default(true),
  
  /** Prefix for primary agents (mode: "primary") */
  primary_prefix: z.string().default("(Open)"),
  
  /** Prefix for subagents (mode: "subagent") */
  subagent_prefix: z.string().default("(OpenSub)"),
  
  /** Default visibility for agents (which agents can see them) */
  default_visible_to: z.array(z.string()).default(["plan", "build"]),
  
  /** Show version popup on session start */
  show_version_popup: z.boolean().default(true),
  
  /** Agent-specific overrides */
  agents: z.record(AgentConfigSchema).optional(),
  
  /** Disabled agents (by name) */
  disabled_agents: z.array(z.string()).optional(),
})

export type OpenAgentsConfig = z.infer<typeof OpenAgentsConfigSchema>
export type AgentConfig = z.infer<typeof AgentConfigSchema>

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: OpenAgentsConfig = {
  enabled: false, // OPT-IN by default
  agents_dir: "./agents",
  default_model: "opencode/big-pickle",
  context_dir: "./.openagents/context",
  add_prefix: true,
  primary_prefix: "(Open)",
  subagent_prefix: "(OpenSub)",
  default_visible_to: ["plan", "build"],
  show_version_popup: true,
  agents: {},
  disabled_agents: [],
}

/**
 * Load config from a directory
 */
export function loadConfig(directory: string): OpenAgentsConfig {
  const configPaths = [
    join(directory, ".openagents", "config.json"),
    join(directory, ".openagents.json"),
    join(directory, "openagents.json"),
  ]
  
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8")
        const raw = JSON.parse(content)
        const result = OpenAgentsConfigSchema.safeParse(raw)
        
        if (result.success) {
          console.log(`[OpenAgents] Config loaded from ${configPath}`)
          return result.data
        } else {
          console.warn(`[OpenAgents] Invalid config in ${configPath}:`, result.error.issues)
        }
      } catch (error) {
        console.error(`[OpenAgents] Failed to load config from ${configPath}:`, error)
      }
    }
  }
  
  console.log("[OpenAgents] Using default config")
  return DEFAULT_CONFIG
}

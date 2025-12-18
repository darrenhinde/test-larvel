/**
 * Agent Loader
 * 
 * Loads agent definitions from markdown files.
 * Agents are defined as .md files with optional YAML frontmatter.
 * 
 * Example agent.md:
 * ```
 * ---
 * description: "A helpful research agent"
 * model: "anthropic/claude-sonnet-4"
 * mode: "subagent"
 * temperature: 0.7
 * ---
 * You are a research agent...
 * ```
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, basename, extname } from "node:path"
import type { AgentDefinition, AgentFrontmatter } from "./types"

/**
 * Parse YAML-like frontmatter from markdown content
 */
function parseFrontmatter(content: string): { frontmatter: AgentFrontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return { frontmatter: {}, body: content.trim() }
  }
  
  const [, yaml, body] = match
  const frontmatter: AgentFrontmatter = {}
  
  // Simple YAML parsing (key: value)
  const lines = yaml.split("\n")
  for (const line of lines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    
    const key = line.slice(0, colonIndex).trim()
    let value: string | number | boolean | string[] = line.slice(colonIndex + 1).trim()
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    // Parse arrays like: tools: ["read", "write"]
    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        value = JSON.parse(value)
      } catch {
        // Keep as string if parse fails
      }
    }
    
    // Parse booleans
    if (value === "true") value = true
    if (value === "false") value = false
    
    // Parse numbers
    if (typeof value === "string" && !isNaN(Number(value)) && value !== "") {
      value = Number(value)
    }
    
    // Map to frontmatter fields
    switch (key) {
      case "description":
        frontmatter.description = value as string
        break
      case "model":
        frontmatter.model = value as string
        break
      case "mode":
        frontmatter.mode = value as "primary" | "subagent"
        break
      case "temperature":
        frontmatter.temperature = value as number
        break
      case "maxTokens":
        frontmatter.maxTokens = value as number
        break
      case "tools":
        frontmatter.tools = value as string[]
        break
      case "disabledTools":
        frontmatter.disabledTools = value as string[]
        break
      case "color":
        frontmatter.color = value as string
        break
    }
  }
  
  return { frontmatter, body: body.trim() }
}

/**
 * Load a single agent from a markdown file
 */
export function loadAgentFromFile(filePath: string): AgentDefinition | null {
  if (!existsSync(filePath)) {
    return null
  }
  
  try {
    const content = readFileSync(filePath, "utf-8")
    const { frontmatter, body } = parseFrontmatter(content)
    
    // Agent name from filename (without extension)
    const name = basename(filePath, extname(filePath))
    
    return {
      name,
      path: filePath,
      prompt: body,
      ...frontmatter
    }
  } catch (error) {
    console.error(`[OpenAgents] Failed to load agent from ${filePath}:`, error)
    return null
  }
}

/**
 * Load all agents from a directory
 */
export function loadAgentsFromDirectory(directory: string): AgentDefinition[] {
  const agents: AgentDefinition[] = []
  
  if (!existsSync(directory)) {
    return agents
  }
  
  try {
    const entries = readdirSync(directory)
    
    for (const entry of entries) {
      const fullPath = join(directory, entry)
      const stat = statSync(fullPath)
      
      // Only load .md files
      if (stat.isFile() && (entry.endsWith(".md") || entry.endsWith(".mdc"))) {
        const agent = loadAgentFromFile(fullPath)
        if (agent) {
          agents.push(agent)
        }
      }
    }
  } catch (error) {
    console.error(`[OpenAgents] Failed to load agents from ${directory}:`, error)
  }
  
  return agents
}

/**
 * Load agents from multiple directories (project, user, etc.)
 * Later directories override earlier ones (by agent name)
 */
export function loadAgents(directories: string[]): Map<string, AgentDefinition> {
  const agentMap = new Map<string, AgentDefinition>()
  
  for (const dir of directories) {
    const agents = loadAgentsFromDirectory(dir)
    for (const agent of agents) {
      agentMap.set(agent.name, agent)
    }
  }
  
  return agentMap
}

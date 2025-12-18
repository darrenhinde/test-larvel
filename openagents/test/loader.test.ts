import { describe, it, expect } from "bun:test"
import { loadAgentFromFile, loadAgentsFromDirectory } from "../src/agents/loader"
import { join } from "node:path"

const FIXTURES_DIR = join(import.meta.dir, "..", ".openagents", "agents")

describe("Agent Loader", () => {
  describe("loadAgentFromFile", () => {
    it("should load an agent from a markdown file", () => {
      const agent = loadAgentFromFile(join(FIXTURES_DIR, "researcher.md"))
      
      expect(agent).not.toBeNull()
      expect(agent!.name).toBe("researcher")
      expect(agent!.description).toBe("Research agent for exploring codebases and finding information")
      expect(agent!.model).toBe("anthropic/claude-sonnet-4")
      expect(agent!.mode).toBe("subagent")
      expect(agent!.temperature).toBe(0.3)
      expect(agent!.prompt).toContain("You are a research specialist")
    })
    
    it("should load agent with disabled tools", () => {
      const agent = loadAgentFromFile(join(FIXTURES_DIR, "reviewer.md"))
      
      expect(agent).not.toBeNull()
      expect(agent!.disabledTools).toEqual(["write", "edit"])
    })
    
    it("should return null for non-existent file", () => {
      const agent = loadAgentFromFile("/non/existent/file.md")
      expect(agent).toBeNull()
    })
  })
  
  describe("loadAgentsFromDirectory", () => {
    it("should load all agents from a directory", () => {
      const agents = loadAgentsFromDirectory(FIXTURES_DIR)
      
      expect(agents.length).toBe(3)
      
      const names = agents.map(a => a.name).sort()
      expect(names).toEqual(["coder", "researcher", "reviewer"])
    })
    
    it("should return empty array for non-existent directory", () => {
      const agents = loadAgentsFromDirectory("/non/existent/dir")
      expect(agents).toEqual([])
    })
  })
})

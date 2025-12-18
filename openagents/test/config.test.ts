import { describe, it, expect } from "bun:test"
import { loadConfig, OpenAgentsConfigSchema, DEFAULT_CONFIG } from "../src/plugin/config"
import { join } from "node:path"

const PROJECT_DIR = join(import.meta.dir, "..")

describe("Config", () => {
  describe("loadConfig", () => {
    it("should load config from .openagents/config.json", () => {
      const config = loadConfig(PROJECT_DIR)
      
      expect(config.agents_dir).toBe("./agents")
      expect(config.default_model).toBe("anthropic/claude-sonnet-4")
      expect(config.agents?.researcher?.async).toBe(true)
      expect(config.agents?.coder?.async).toBe(false)
    })
    
    it("should return default config for non-existent directory", () => {
      const config = loadConfig("/non/existent/dir")
      
      expect(config).toEqual(DEFAULT_CONFIG)
    })
  })
  
  describe("OpenAgentsConfigSchema", () => {
    it("should validate a valid config", () => {
      const result = OpenAgentsConfigSchema.safeParse({
        agents_dir: "./my-agents",
        default_model: "openai/gpt-4",
        agents: {
          myAgent: {
            model: "anthropic/claude-sonnet-4",
            async: true
          }
        }
      })
      
      expect(result.success).toBe(true)
    })
    
    it("should reject invalid temperature", () => {
      const result = OpenAgentsConfigSchema.safeParse({
        agents: {
          myAgent: {
            temperature: 5 // Invalid: max is 2
          }
        }
      })
      
      expect(result.success).toBe(false)
    })
    
    it("should apply defaults", () => {
      const result = OpenAgentsConfigSchema.safeParse({})
      
      expect(result.success).toBe(true)
      expect(result.data?.agents_dir).toBe("./agents")
    })
  })
})

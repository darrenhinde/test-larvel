import { describe, it, expect, mock } from "bun:test"
import { join } from "node:path"

// Import the plugin
import OpenAgentsPlugin from "../src/plugin"

const PROJECT_DIR = join(import.meta.dir, "..")

describe("OpenAgents Plugin", () => {
  it("should be a function (Plugin type)", () => {
    expect(typeof OpenAgentsPlugin).toBe("function")
  })
  
  it("should return hooks object when called with context", async () => {
    // Mock the plugin context
    const mockCtx = {
      client: {},
      project: {},
      directory: PROJECT_DIR,
      worktree: PROJECT_DIR,
      $: {} as any,
    }
    
    const hooks = await OpenAgentsPlugin(mockCtx as any)
    
    expect(hooks).toBeDefined()
    expect(typeof hooks.config).toBe("function")
  })
  
  it("should register agents via config hook", async () => {
    const mockCtx = {
      client: {},
      project: {},
      directory: PROJECT_DIR,
      worktree: PROJECT_DIR,
      $: {} as any,
    }
    
    const hooks = await OpenAgentsPlugin(mockCtx as any)
    
    // Mock OpenCode config object
    const openCodeConfig: any = {
      agent: {}
    }
    
    // Call the config hook
    await hooks.config!(openCodeConfig)
    
    // Check that our agents were registered
    expect(openCodeConfig.agent.researcher).toBeDefined()
    expect(openCodeConfig.agent.coder).toBeDefined()
    expect(openCodeConfig.agent.reviewer).toBeDefined()
    
    // Check agent properties
    expect(openCodeConfig.agent.researcher.description).toBe("Research agent for exploring codebases and finding information")
    expect(openCodeConfig.agent.researcher.mode).toBe("subagent")
    expect(openCodeConfig.agent.researcher.prompt).toContain("You are a research specialist")
    
    // Check reviewer has disabled tools
    expect(openCodeConfig.agent.reviewer.tools).toEqual({
      write: false,
      edit: false
    })
  })
  
  it("should not override existing agents", async () => {
    const mockCtx = {
      client: {},
      project: {},
      directory: PROJECT_DIR,
      worktree: PROJECT_DIR,
      $: {} as any,
    }
    
    const hooks = await OpenAgentsPlugin(mockCtx as any)
    
    // Mock OpenCode config with existing agent
    const openCodeConfig: any = {
      agent: {
        researcher: {
          description: "Existing researcher",
          prompt: "Existing prompt"
        }
      }
    }
    
    await hooks.config!(openCodeConfig)
    
    // Existing agent should NOT be overridden
    expect(openCodeConfig.agent.researcher.description).toBe("Existing researcher")
    expect(openCodeConfig.agent.researcher.prompt).toBe("Existing prompt")
    
    // But new agents should be added
    expect(openCodeConfig.agent.coder).toBeDefined()
    expect(openCodeConfig.agent.reviewer).toBeDefined()
  })
})

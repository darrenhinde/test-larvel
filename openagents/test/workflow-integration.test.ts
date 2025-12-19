/**
 * Workflow Integration Tests
 * 
 * Verifies the complete workflow system works end-to-end with:
 * - Agent resolution
 * - Tool configuration
 * - Limits
 * - Multi-source agents
 */

import { describe, test, expect, mock, beforeEach } from "bun:test"
import { WorkflowExecutor, AgentStepExecutor } from "../src/workflow"
import { AgentResolver } from "../src/workflow/agent-resolver"
import type { AgentDefinition } from "../src/agents/types"
import type { WorkflowDefinition, UIManager, AgentExecutor } from "../src/workflow/types"

// Mock OpenCode client
const createMockClient = () => ({
  task: mock(async (params: any) => {
    return { result: `${params.subagent_type} completed` }
  }),
  tui: {
    showToast: mock(async () => {}),
    showPrompt: mock(async () => ({ value: "approve" }))
  }
})

// Mock UI Manager
const createMockUIManager = (): UIManager => ({
  showApprovalPrompt: mock(async () => true),
  showWorkflowStart: mock(async () => {}),
  showWorkflowComplete: mock(async () => {}),
  showWorkflowError: mock(async () => {}),
  showStepProgress: mock(async () => {})
})

describe("Workflow Integration", () => {
  describe("Agent Resolution", () => {
    test("resolves OpenAgents agents", () => {
      const agentMap = new Map<string, AgentDefinition>([
        ["planner", {
          name: "planner",
          path: "/path/to/planner.md",
          prompt: "You are a planner",
          description: "Planning agent",
          model: "anthropic/claude-sonnet-4",
          tools: ["read", "write"]
        }]
      ])

      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      const agent = resolver.resolve("planner")

      expect(agent).not.toBeNull()
      expect(agent?.name).toBe("planner")
      expect(agent?.source).toBe("openagents")
      expect(agent?.definition?.tools).toEqual(["read", "write"])
    })

    test("resolves OpenCode built-in agents", () => {
      const agentMap = new Map<string, AgentDefinition>()
      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      // Register OpenCode agents
      resolver.registerOpenCodeAgents(["plan", "build", "test"])

      const agent = resolver.resolve("plan")

      expect(agent).not.toBeNull()
      expect(agent?.name).toBe("plan")
      expect(agent?.source).toBe("opencode")
      expect(agent?.registered).toBe(true)
    })

    test("prioritizes OpenAgents over OpenCode", () => {
      const agentMap = new Map<string, AgentDefinition>([
        ["plan", {
          name: "plan",
          path: "/path/to/plan.md",
          prompt: "Custom planner",
          description: "Custom planning agent"
        }]
      ])

      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)
      resolver.registerOpenCodeAgents(["plan", "build"])

      const agent = resolver.resolve("plan")

      expect(agent?.source).toBe("openagents")
      expect(agent?.definition?.prompt).toBe("Custom planner")
    })

    test("lists all available agents", () => {
      const agentMap = new Map<string, AgentDefinition>([
        ["custom1", { name: "custom1", path: "", prompt: "" }],
        ["custom2", { name: "custom2", path: "", prompt: "" }]
      ])

      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)
      resolver.registerOpenCodeAgents(["plan", "build"])

      const allAgents = resolver.listAgentNames()

      expect(allAgents).toContain("custom1")
      expect(allAgents).toContain("custom2")
      expect(allAgents).toContain("plan")
      expect(allAgents).toContain("build")
      expect(allAgents.length).toBe(4)
    })
  })

  describe("Tool Configuration", () => {
    test("agents execute with configured tools", async () => {
      const agentMap = new Map<string, AgentDefinition>([
        ["coder", {
          name: "coder",
          path: "/path/to/coder.md",
          prompt: "You are a coder",
          tools: ["read", "write", "edit"],
          disabledTools: ["bash", "webfetch"]
        }]
      ])

      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      const agent = resolver.resolve("coder")

      expect(agent?.definition?.tools).toEqual(["read", "write", "edit"])
      expect(agent?.definition?.disabledTools).toEqual(["bash", "webfetch"])
    })

    test("config overrides merge with agent tools", () => {
      const agentMap = new Map<string, AgentDefinition>([
        ["coder", {
          name: "coder",
          path: "/path/to/coder.md",
          prompt: "You are a coder",
          tools: ["read", "write"],
          disabledTools: ["bash"]
        }]
      ])

      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      const agent = resolver.resolve("coder")

      // Base tools from agent definition
      expect(agent?.definition?.tools).toEqual(["read", "write"])
      expect(agent?.definition?.disabledTools).toEqual(["bash"])

      // Config would override these (tested in executor)
    })
  })

  describe("Workflow Execution with Mixed Agents", () => {
    test("executes workflow with OpenAgents and OpenCode agents", async () => {
      // Setup: OpenAgents custom agent
      const agentMap = new Map<string, AgentDefinition>([
        ["analyzer", {
          name: "analyzer",
          path: "/path/to/analyzer.md",
          prompt: "You analyze code",
          description: "Code analyzer"
        }]
      ])

      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)
      
      // Register OpenCode agents
      resolver.registerOpenCodeAgents(["plan", "build"])

      // Create mock agent executor
      const mockAgentExecutor: AgentExecutor = {
        execute: mock(async (agentName: string, input: any) => {
          const agent = resolver.resolve(agentName)
          if (!agent) throw new Error(`Agent ${agentName} not found`)
          
          return {
            agent: agentName,
            source: agent.source,
            result: `${agentName} completed`
          }
        })
      }

      const uiManager = createMockUIManager()
      const executor = new WorkflowExecutor({
        agentExecutor: mockAgentExecutor,
        uiManager
      })

      executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

      // Workflow using both OpenCode and OpenAgents
      const workflow: WorkflowDefinition = {
        id: "mixed-workflow",
        description: "Uses both OpenCode and OpenAgents",
        steps: [
          { id: "plan", type: "agent", agent: "plan", next: "analyze" },
          { id: "analyze", type: "agent", agent: "analyzer", next: "build" },
          { id: "build", type: "agent", agent: "build" }
        ]
      }

      const result = await executor.execute(workflow, { task: "Build feature" })

      expect(result.success).toBe(true)
      expect(result.context.results.size).toBe(3)
      
      const planResult = result.context.getResult("plan")
      const analyzeResult = result.context.getResult("analyze")
      const buildResult = result.context.getResult("build")

      expect(planResult?.success).toBe(true)
      expect(planResult?.data.source).toBe("opencode")
      
      expect(analyzeResult?.success).toBe(true)
      expect(analyzeResult?.data.source).toBe("openagents")
      
      expect(buildResult?.success).toBe(true)
      expect(buildResult?.data.source).toBe("opencode")
    })

    test("workflow fails gracefully when agent not found", async () => {
      const agentMap = new Map<string, AgentDefinition>()
      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      const mockAgentExecutor: AgentExecutor = {
        execute: mock(async (agentName: string) => {
          const agent = resolver.resolve(agentName)
          if (!agent) {
            throw new Error(`Agent '${agentName}' not found`)
          }
          return { result: "ok" }
        })
      }

      const uiManager = createMockUIManager()
      const executor = new WorkflowExecutor({
        agentExecutor: mockAgentExecutor,
        uiManager
      })

      executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

      const workflow: WorkflowDefinition = {
        id: "fail-workflow",
        description: "Uses non-existent agent",
        steps: [
          { id: "missing", type: "agent", agent: "non-existent" }
        ]
      }

      const result = await executor.execute(workflow, { task: "Test" })

      // The step should fail because agent throws error
      expect(result.success).toBe(true) // Workflow completes
      const stepResult = result.context.getResult("missing")
      expect(stepResult?.success).toBe(false) // But step fails
      expect(stepResult?.error?.message).toContain("not found")
    })
  })

  describe("Limits and Timeouts", () => {
    test("respects step timeout", async () => {
      const agentMap = new Map<string, AgentDefinition>()
      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      const mockAgentExecutor: AgentExecutor = {
        execute: mock(async (agentName: string) => {
          // Simulate slow agent
          await new Promise(resolve => setTimeout(resolve, 200))
          return { result: "slow" }
        })
      }

      const uiManager = createMockUIManager()
      const executor = new WorkflowExecutor({
        agentExecutor: mockAgentExecutor,
        uiManager
      })

      executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

      const workflow: WorkflowDefinition = {
        id: "timeout-workflow",
        description: "Step times out",
        steps: [
          {
            id: "slow",
            type: "agent",
            agent: "slow-agent",
            timeout_ms: 100  // Very short timeout
          }
        ]
      }

      const result = await executor.execute(workflow, { task: "Test" })

      // Workflow completes but step fails due to timeout
      expect(result.success).toBe(true)
      const stepResult = result.context.getResult("slow")
      expect(stepResult?.success).toBe(false)
      expect(stepResult?.error?.message).toContain("timed out")
    })

    test("respects max retries", async () => {
      let attempts = 0

      const agentMap = new Map<string, AgentDefinition>()
      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      const mockAgentExecutor: AgentExecutor = {
        execute: mock(async () => {
          attempts++
          if (attempts < 3) {
            throw new Error("Temporary failure")
          }
          return { result: "success" }
        })
      }

      const uiManager = createMockUIManager()
      const executor = new WorkflowExecutor({
        agentExecutor: mockAgentExecutor,
        uiManager
      })

      executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

      const workflow: WorkflowDefinition = {
        id: "retry-workflow",
        description: "Retries on failure",
        steps: [
          {
            id: "flaky",
            type: "agent",
            agent: "flaky-agent",
            max_retries: 3
          }
        ]
      }

      const result = await executor.execute(workflow, { task: "Test" })

      expect(result.success).toBe(true)
      expect(attempts).toBe(3)
      
      const stepResult = result.context.getResult("flaky")
      expect(stepResult?.retries).toBeGreaterThan(0)
    })
  })

  describe("Context Passing", () => {
    test("passes context between steps", async () => {
      const agentMap = new Map<string, AgentDefinition>()
      const client = createMockClient()
      const resolver = new AgentResolver(agentMap, client as any)

      let capturedInputs: any[] = []

      const mockAgentExecutor: AgentExecutor = {
        execute: mock(async (agentName: string, input: any) => {
          capturedInputs.push({ agent: agentName, input })
          
          if (agentName === "planner") {
            return { files: ["a.ts", "b.ts"] }
          }
          if (agentName === "coder") {
            return { filesCreated: input.context.planner.files }
          }
          return { result: "ok" }
        })
      }

      const uiManager = createMockUIManager()
      const executor = new WorkflowExecutor({
        agentExecutor: mockAgentExecutor,
        uiManager
      })

      executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

      const workflow: WorkflowDefinition = {
        id: "context-workflow",
        description: "Tests context passing",
        steps: [
          { id: "planner", type: "agent", agent: "planner", next: "coder" },
          { id: "coder", type: "agent", agent: "coder", input: "planner" }
        ]
      }

      const result = await executor.execute(workflow, { task: "Build feature" })

      expect(result.success).toBe(true)
      
      // Check coder received planner's output
      const coderInput = capturedInputs.find(i => i.agent === "coder")
      expect(coderInput.input.context.planner).toEqual({ files: ["a.ts", "b.ts"] })
      expect(coderInput.input.planner).toEqual({ files: ["a.ts", "b.ts"] })
      
      const coderResult = result.context.getResult("coder")
      expect(coderResult?.data.filesCreated).toEqual(["a.ts", "b.ts"])
    })
  })
})

/**
 * Workflow Executor Tests
 */

import { describe, test, expect, mock } from "bun:test"
import { WorkflowExecutor, MaxErrorGuard, CircularDependencyGuard } from "./executor"
import { AgentStepExecutor } from "./executors/agent"
import type { WorkflowDefinition, AgentExecutor, UIManager } from "./types"

// Mock UI Manager
const createMockUIManager = (): UIManager => ({
  showApprovalPrompt: mock(async () => true),
  showWorkflowStart: mock(async () => {}),
  showWorkflowComplete: mock(async () => {}),
  showWorkflowError: mock(async () => {}),
  showStepProgress: mock(async () => {})
})

// Mock Agent Executor
const createMockAgentExecutor = (responses: Record<string, any> = {}): AgentExecutor => ({
  execute: mock(async (agentName: string, input: any) => {
    return responses[agentName] ?? { result: `${agentName} completed` }
  })
})

describe("WorkflowExecutor", () => {
  test("executes simple sequential workflow", async () => {
    const mockAgentExecutor = createMockAgentExecutor({
      planner: { plan: "Create files a.ts, b.ts" },
      coder: { files: ["a.ts", "b.ts"] },
      tester: { tests: "All passed" }
    })

    const mockUIManager = createMockUIManager()

    const executor = new WorkflowExecutor({
      agentExecutor: mockAgentExecutor,
      uiManager: mockUIManager
    })

    // Register agent executor
    executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

    const workflow: WorkflowDefinition = {
      id: "simple-workflow",
      description: "Plan → Code → Test",
      steps: [
        { id: "plan", type: "agent", agent: "planner", next: "code" },
        { id: "code", type: "agent", agent: "coder", next: "test" },
        { id: "test", type: "agent", agent: "tester" }
      ]
    }

    const result = await executor.execute(workflow, { task: "Build feature" })

    expect(result.success).toBe(true)
    expect(result.context.results.size).toBe(3)
    expect(result.context.getResult("plan")?.success).toBe(true)
    expect(result.context.getResult("code")?.success).toBe(true)
    expect(result.context.getResult("test")?.success).toBe(true)
    expect(mockUIManager.showWorkflowStart).toHaveBeenCalledWith("simple-workflow")
    expect(mockUIManager.showWorkflowComplete).toHaveBeenCalled()
  })

  test("handles step failure with error handler", async () => {
    const mockAgentExecutor = createMockAgentExecutor({
      planner: { plan: "Create files" },
      coder: null, // Will cause failure
      errorHandler: { recovered: true }
    })

    // Make coder fail
    mockAgentExecutor.execute = mock(async (agentName: string) => {
      if (agentName === "coder") {
        throw new Error("Coder failed")
      }
      return { result: `${agentName} completed` }
    })

    const mockUIManager = createMockUIManager()

    const executor = new WorkflowExecutor({
      agentExecutor: mockAgentExecutor,
      uiManager: mockUIManager
    })

    executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

    const workflow: WorkflowDefinition = {
      id: "error-workflow",
      description: "Plan → Code (fails) → Error Handler",
      steps: [
        { id: "plan", type: "agent", agent: "planner", next: "code" },
        { id: "code", type: "agent", agent: "coder", on_error: "error-handler" },
        { id: "error-handler", type: "agent", agent: "errorHandler" }
      ]
    }

    const result = await executor.execute(workflow, { task: "Build feature" })

    expect(result.success).toBe(true)
    expect(result.context.getResult("plan")?.success).toBe(true)
    expect(result.context.getResult("code")?.success).toBe(false)
    expect(result.context.getResult("error-handler")?.success).toBe(true)
  })

  test("stops workflow when no next step", async () => {
    const mockAgentExecutor = createMockAgentExecutor({
      planner: { plan: "Create files" }
    })

    const mockUIManager = createMockUIManager()

    const executor = new WorkflowExecutor({
      agentExecutor: mockAgentExecutor,
      uiManager: mockUIManager
    })

    executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

    const workflow: WorkflowDefinition = {
      id: "single-step-workflow",
      description: "Plan only",
      steps: [
        { id: "plan", type: "agent", agent: "planner" }
        // No next step
      ]
    }

    const result = await executor.execute(workflow, { task: "Build feature" })

    expect(result.success).toBe(true)
    expect(result.context.results.size).toBe(1)
    expect(result.context.getResult("plan")?.success).toBe(true)
  })

  test("enforces max iterations guard", async () => {
    const mockAgentExecutor = createMockAgentExecutor({
      loop: { result: "looping" }
    })

    const mockUIManager = createMockUIManager()

    const executor = new WorkflowExecutor({
      agentExecutor: mockAgentExecutor,
      uiManager: mockUIManager
    })

    executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

    const workflow: WorkflowDefinition = {
      id: "infinite-loop-workflow",
      description: "Infinite loop",
      max_iterations: 5,
      steps: [
        { id: "loop", type: "agent", agent: "loop", next: "loop" } // Points to itself
      ]
    }

    const result = await executor.execute(workflow, { task: "Build feature" })

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain("exceeded maximum iterations")
    expect(mockUIManager.showWorkflowError).toHaveBeenCalled()
  })

  test("enforces max duration guard", async () => {
    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async () => {
        // Simulate slow agent
        await new Promise(resolve => setTimeout(resolve, 200))
        return { result: "slow" }
      })
    }

    const mockUIManager = createMockUIManager()

    const executor = new WorkflowExecutor({
      agentExecutor: mockAgentExecutor,
      uiManager: mockUIManager
    })

    executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

    const workflow: WorkflowDefinition = {
      id: "timeout-workflow",
      description: "Times out",
      max_duration_ms: 100, // Very short timeout
      steps: [
        { id: "slow", type: "agent", agent: "slow", next: "slow2" },
        { id: "slow2", type: "agent", agent: "slow" }
      ]
    }

    const result = await executor.execute(workflow, { task: "Build feature" })

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain("exceeded maximum duration")
  })

  test("throws error for unknown step type", async () => {
    const mockAgentExecutor = createMockAgentExecutor()
    const mockUIManager = createMockUIManager()

    const executor = new WorkflowExecutor({
      agentExecutor: mockAgentExecutor,
      uiManager: mockUIManager
    })

    // Don't register any executors

    const workflow: WorkflowDefinition = {
      id: "unknown-type-workflow",
      description: "Unknown step type",
      steps: [
        { id: "unknown", type: "agent", agent: "test" }
      ]
    }

    const result = await executor.execute(workflow, { task: "Build feature" })

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain("No executor registered")
  })
})

describe("MaxErrorGuard", () => {
  test("allows workflow with few errors", () => {
    const guard = new MaxErrorGuard(3)
    const context = {
      workflowId: "test",
      startTime: new Date(),
      input: {},
      results: new Map(),
      metadata: {
        currentStep: "step1",
        previousSteps: [],
        iterationCount: 1,
        errorCount: 2
      },
      addResult: () => context,
      getResult: () => undefined,
      incrementIteration: () => context,
      incrementError: () => context,
      setCurrentStep: () => context
    }

    expect(() => guard.check(context, {} as any)).not.toThrow()
  })

  test("blocks workflow with too many errors", () => {
    const guard = new MaxErrorGuard(3)
    const context = {
      workflowId: "test",
      startTime: new Date(),
      input: {},
      results: new Map(),
      metadata: {
        currentStep: "step1",
        previousSteps: [],
        iterationCount: 1,
        errorCount: 5
      },
      addResult: () => context,
      getResult: () => undefined,
      incrementIteration: () => context,
      incrementError: () => context,
      setCurrentStep: () => context
    }

    expect(() => guard.check(context, {} as any)).toThrow("exceeded maximum errors")
  })
})

describe("CircularDependencyGuard", () => {
  test("allows workflow without circular dependencies", () => {
    const guard = new CircularDependencyGuard()
    const context = {
      workflowId: "test",
      startTime: new Date(),
      input: {},
      results: new Map(),
      metadata: {
        currentStep: "step3",
        previousSteps: ["step1", "step2"],
        iterationCount: 3,
        errorCount: 0
      },
      addResult: () => context,
      getResult: () => undefined,
      incrementIteration: () => context,
      incrementError: () => context,
      setCurrentStep: () => context
    }

    expect(() => guard.check(context, {} as any)).not.toThrow()
  })

  test("detects circular dependencies", () => {
    const guard = new CircularDependencyGuard()
    const context = {
      workflowId: "test",
      startTime: new Date(),
      input: {},
      results: new Map(),
      metadata: {
        currentStep: "loop",
        previousSteps: ["loop", "loop", "loop", "loop"],
        iterationCount: 5,
        errorCount: 0
      },
      addResult: () => context,
      getResult: () => undefined,
      incrementIteration: () => context,
      incrementError: () => context,
      setCurrentStep: () => context
    }

    expect(() => guard.check(context, {} as any)).toThrow("Circular dependency detected")
  })
})

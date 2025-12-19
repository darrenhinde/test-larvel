/**
 * Agent Executor Tests
 */

import { describe, test, expect, mock } from "bun:test"
import { AgentStepExecutor, TransformStepExecutor, ConditionStepExecutor } from "./agent"
import { createContext } from "../context/context"
import type { WorkflowStep, AgentExecutor } from "../types"

describe("AgentStepExecutor", () => {
  test("executes agent with context", async () => {
    // Mock agent executor
    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async (agentName: string, input: any) => {
        return { result: "success", agent: agentName }
      })
    }

    const executor = new AgentStepExecutor(mockAgentExecutor)
    const context = createContext("test-workflow", { task: "Build feature" })

    const step: WorkflowStep = {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code"
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(true)
    expect(result.stepId).toBe("plan")
    expect(result.data).toEqual({ result: "success", agent: "planner" })
    expect(mockAgentExecutor.execute).toHaveBeenCalledTimes(1)
  })

  test("builds agent input with context", async () => {
    let capturedInput: any

    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async (agentName: string, input: any) => {
        capturedInput = input
        return { result: "success" }
      })
    }

    const executor = new AgentStepExecutor(mockAgentExecutor)
    let context = createContext("test-workflow", { task: "Build feature" })

    // Add previous step result
    context = context.addResult("plan", {
      stepId: "plan",
      success: true,
      data: { files: ["a.ts", "b.ts"] },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    })

    const step: WorkflowStep = {
      id: "code",
      type: "agent",
      agent: "coder",
      input: "plan"
    }

    await executor.execute(step, context)

    expect(capturedInput).toEqual({
      input: { task: "Build feature" },
      context: {
        plan: { files: ["a.ts", "b.ts"] }
      },
      plan: { files: ["a.ts", "b.ts"] }
    })
  })

  test("handles missing agent name", async () => {
    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async () => ({ result: "success" }))
    }

    const executor = new AgentStepExecutor(mockAgentExecutor)
    const context = createContext("test-workflow", { task: "Build feature" })

    const step: WorkflowStep = {
      id: "invalid",
      type: "agent"
      // Missing agent field
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain("missing 'agent' field")
  })

  test("retries on failure", async () => {
    let attempts = 0

    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error("Agent failed")
        }
        return { result: "success" }
      })
    }

    const executor = new AgentStepExecutor(mockAgentExecutor, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 1,
      maxDelayMs: 100
    })

    const context = createContext("test-workflow", { task: "Build feature" })

    const step: WorkflowStep = {
      id: "plan",
      type: "agent",
      agent: "planner",
      max_retries: 3
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(true)
    expect(result.retries).toBe(1) // Retry count is attempt number when successful
    expect(attempts).toBe(3)
  })

  test("routes to next step on success", () => {
    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async () => ({ result: "success" }))
    }

    const executor = new AgentStepExecutor(mockAgentExecutor)
    const context = createContext("test-workflow", { task: "Build feature" })

    const step: WorkflowStep = {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code"
    }

    const result = {
      stepId: "plan",
      success: true,
      data: { result: "success" },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    }

    const nextStep = executor.route(step, result, context)

    expect(nextStep).toBe("code")
  })

  test("routes to error handler on failure", () => {
    const mockAgentExecutor: AgentExecutor = {
      execute: mock(async () => ({ result: "success" }))
    }

    const executor = new AgentStepExecutor(mockAgentExecutor)
    const context = createContext("test-workflow", { task: "Build feature" })

    const step: WorkflowStep = {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code",
      on_error: "error-handler"
    }

    const result = {
      stepId: "plan",
      success: false,
      data: null,
      error: new Error("Failed"),
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    }

    const nextStep = executor.route(step, result, context)

    expect(nextStep).toBe("error-handler")
  })
})

describe("TransformStepExecutor", () => {
  test("executes transform expression", async () => {
    const executor = new TransformStepExecutor()
    let context = createContext("test-workflow", { value: 10 })

    // Add previous step result
    context = context.addResult("calculate", {
      stepId: "calculate",
      success: true,
      data: { result: 42 },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    })

    const step: WorkflowStep = {
      id: "transform",
      type: "transform",
      transform: "calculate.result * 2"
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(true)
    expect(result.data).toBe(84)
  })

  test("handles transform errors", async () => {
    const executor = new TransformStepExecutor()
    const context = createContext("test-workflow", { value: 10 })

    const step: WorkflowStep = {
      id: "transform",
      type: "transform",
      transform: "nonexistent.field"
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain("Transform step")
  })
})

describe("ConditionStepExecutor", () => {
  test("evaluates condition to true", async () => {
    const executor = new ConditionStepExecutor()
    let context = createContext("test-workflow", { value: 10 })

    // Add previous step result
    context = context.addResult("check", {
      stepId: "check",
      success: true,
      data: { count: 5 },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    })

    const step: WorkflowStep = {
      id: "condition",
      type: "condition",
      condition: "check.count > 3",
      then: "success-path",
      else: "failure-path"
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(true)
    expect(result.data.condition).toBe(true)

    const nextStep = executor.route(step, result, context)
    expect(nextStep).toBe("success-path")
  })

  test("evaluates condition to false", async () => {
    const executor = new ConditionStepExecutor()
    let context = createContext("test-workflow", { value: 10 })

    // Add previous step result
    context = context.addResult("check", {
      stepId: "check",
      success: true,
      data: { count: 2 },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    })

    const step: WorkflowStep = {
      id: "condition",
      type: "condition",
      condition: "check.count > 3",
      then: "success-path",
      else: "failure-path"
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(true)
    expect(result.data.condition).toBe(false)

    const nextStep = executor.route(step, result, context)
    expect(nextStep).toBe("failure-path")
  })

  test("handles condition errors", async () => {
    const executor = new ConditionStepExecutor()
    const context = createContext("test-workflow", { value: 10 })

    const step: WorkflowStep = {
      id: "condition",
      type: "condition",
      condition: "invalid syntax !!!"
    }

    const result = await executor.execute(step, context)

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain("Condition step")
  })
})

/**
 * Context Management Tests
 */

import { describe, it, expect } from "bun:test"
import {
  createContext,
  buildContextObject,
  getContextValue,
  pruneContext,
  serializeContext,
  buildAgentInput,
  hasResult,
  getSuccessfulResults,
  getFailedResults,
  getWorkflowDuration,
  getWorkflowStats
} from "./context"
import type { StepResult } from "../types"

describe("createContext", () => {
  it("should create initial context with correct properties", () => {
    const ctx = createContext("test-workflow", { foo: "bar" })
    
    expect(ctx.workflowId).toBe("test-workflow")
    expect(ctx.input).toEqual({ foo: "bar" })
    expect(ctx.results.size).toBe(0)
    expect(ctx.metadata.currentStep).toBe("")
    expect(ctx.metadata.previousSteps).toEqual([])
    expect(ctx.metadata.iterationCount).toBe(0)
    expect(ctx.metadata.errorCount).toBe(0)
    expect(ctx.startTime).toBeInstanceOf(Date)
  })
  
  it("should create context with empty input", () => {
    const ctx = createContext("test", {})
    
    expect(ctx.input).toEqual({})
    expect(ctx.results.size).toBe(0)
  })
})

describe("addResult", () => {
  it("should add result without mutating original context", () => {
    const ctx1 = createContext("test", {})
    const result: StepResult = {
      stepId: "step1",
      success: true,
      data: { output: "test" },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    }
    
    const ctx2 = ctx1.addResult("step1", result)
    
    // Original unchanged
    expect(ctx1.results.size).toBe(0)
    expect(ctx1.metadata.currentStep).toBe("")
    expect(ctx1.metadata.previousSteps).toEqual([])
    
    // New context has result
    expect(ctx2.results.size).toBe(1)
    expect(ctx2.getResult("step1")).toEqual(result)
    expect(ctx2.metadata.currentStep).toBe("step1")
    expect(ctx2.metadata.previousSteps).toEqual(["step1"])
  })
  
  it("should add multiple results", () => {
    const ctx1 = createContext("test", {})
    
    const result1: StepResult = {
      stepId: "step1",
      success: true,
      data: { output: "result1" },
      startTime: new Date(),
      endTime: new Date(),
      duration: 100
    }
    
    const result2: StepResult = {
      stepId: "step2",
      success: true,
      data: { output: "result2" },
      startTime: new Date(),
      endTime: new Date(),
      duration: 200
    }
    
    const ctx2 = ctx1.addResult("step1", result1)
    const ctx3 = ctx2.addResult("step2", result2)
    
    expect(ctx3.results.size).toBe(2)
    expect(ctx3.getResult("step1")).toEqual(result1)
    expect(ctx3.getResult("step2")).toEqual(result2)
    expect(ctx3.metadata.previousSteps).toEqual(["step1", "step2"])
  })
})

describe("incrementIteration", () => {
  it("should increment iteration count", () => {
    const ctx1 = createContext("test", {})
    const ctx2 = ctx1.incrementIteration()
    const ctx3 = ctx2.incrementIteration()
    
    expect(ctx1.metadata.iterationCount).toBe(0)
    expect(ctx2.metadata.iterationCount).toBe(1)
    expect(ctx3.metadata.iterationCount).toBe(2)
  })
})

describe("incrementError", () => {
  it("should increment error count", () => {
    const ctx1 = createContext("test", {})
    const ctx2 = ctx1.incrementError()
    const ctx3 = ctx2.incrementError()
    
    expect(ctx1.metadata.errorCount).toBe(0)
    expect(ctx2.metadata.errorCount).toBe(1)
    expect(ctx3.metadata.errorCount).toBe(2)
  })
})

describe("setCurrentStep", () => {
  it("should update current step", () => {
    const ctx1 = createContext("test", {})
    const ctx2 = ctx1.setCurrentStep("step1")
    
    expect(ctx1.metadata.currentStep).toBe("")
    expect(ctx2.metadata.currentStep).toBe("step1")
  })
})

describe("buildContextObject", () => {
  it("should build context object from successful results", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: { output: "result1" },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
      .addResult("step2", {
        stepId: "step2",
        success: true,
        data: { output: "result2" },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const contextObj = buildContextObject(ctx)
    
    expect(contextObj).toEqual({
      step1: { output: "result1" },
      step2: { output: "result2" }
    })
  })
  
  it("should exclude failed steps", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: { output: "result1" },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
      .addResult("step2", {
        stepId: "step2",
        success: false,
        data: null,
        error: new Error("Failed"),
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const contextObj = buildContextObject(ctx)
    
    expect(contextObj).toEqual({
      step1: { output: "result1" }
    })
  })
  
  it("should return empty object for empty context", () => {
    const ctx = createContext("test", {})
    const contextObj = buildContextObject(ctx)
    
    expect(contextObj).toEqual({})
  })
})

describe("getContextValue", () => {
  it("should get value by path", () => {
    const ctx = createContext("test", {})
      .addResult("plan", {
        stepId: "plan",
        success: true,
        data: { files: ["a.ts", "b.ts"], approach: "test" },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    expect(getContextValue(ctx, "plan.files")).toEqual(["a.ts", "b.ts"])
    expect(getContextValue(ctx, "plan.approach")).toBe("test")
  })
  
  it("should return undefined for non-existent path", () => {
    const ctx = createContext("test", {})
      .addResult("plan", {
        stepId: "plan",
        success: true,
        data: { files: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    expect(getContextValue(ctx, "plan.missing")).toBeUndefined()
    expect(getContextValue(ctx, "missing.field")).toBeUndefined()
  })
  
  it("should return undefined for failed step", () => {
    const ctx = createContext("test", {})
      .addResult("plan", {
        stepId: "plan",
        success: false,
        data: null,
        error: new Error("Failed"),
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    expect(getContextValue(ctx, "plan.files")).toBeUndefined()
  })
})

describe("pruneContext", () => {
  it("should prune context to max size", () => {
    let ctx = createContext("test", {})
    
    // Add 10 results
    for (let i = 0; i < 10; i++) {
      ctx = ctx.addResult(`step${i}`, {
        stepId: `step${i}`,
        success: true,
        data: { value: i },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    }
    
    expect(ctx.results.size).toBe(10)
    
    // Prune to 5
    const pruned = pruneContext(ctx, 5)
    
    expect(pruned.results.size).toBe(5)
    expect(pruned.getResult("step5")).toBeDefined()
    expect(pruned.getResult("step9")).toBeDefined()
    expect(pruned.getResult("step0")).toBeUndefined()
  })
  
  it("should not prune if under max size", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: {},
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const pruned = pruneContext(ctx, 10)
    
    expect(pruned.results.size).toBe(1)
  })
})

describe("buildAgentInput", () => {
  it("should build agent input with context", () => {
    const ctx = createContext("test", { task: "build feature" })
      .addResult("plan", {
        stepId: "plan",
        success: true,
        data: { files: ["a.ts"] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const input = buildAgentInput(ctx)
    
    expect(input).toEqual({
      input: { task: "build feature" },
      context: {
        plan: { files: ["a.ts"] }
      }
    })
  })
  
  it("should include explicit reference", () => {
    const ctx = createContext("test", {})
      .addResult("plan", {
        stepId: "plan",
        success: true,
        data: { files: ["a.ts"] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const input = buildAgentInput(ctx, "plan")
    
    expect(input).toEqual({
      input: {},
      context: {
        plan: { files: ["a.ts"] }
      },
      plan: { files: ["a.ts"] }
    })
  })
})

describe("hasResult", () => {
  it("should check if result exists", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: {},
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    expect(hasResult(ctx, "step1")).toBe(true)
    expect(hasResult(ctx, "step2")).toBe(false)
  })
})

describe("getSuccessfulResults", () => {
  it("should get only successful results", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: {},
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
      .addResult("step2", {
        stepId: "step2",
        success: false,
        data: null,
        error: new Error("Failed"),
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const successful = getSuccessfulResults(ctx)
    
    expect(successful).toHaveLength(1)
    expect(successful[0].stepId).toBe("step1")
  })
})

describe("getFailedResults", () => {
  it("should get only failed results", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: {},
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
      .addResult("step2", {
        stepId: "step2",
        success: false,
        data: null,
        error: new Error("Failed"),
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
    
    const failed = getFailedResults(ctx)
    
    expect(failed).toHaveLength(1)
    expect(failed[0].stepId).toBe("step2")
  })
})

describe("getWorkflowStats", () => {
  it("should calculate workflow statistics", () => {
    const ctx = createContext("test", {})
      .addResult("step1", {
        stepId: "step1",
        success: true,
        data: {},
        startTime: new Date(),
        endTime: new Date(),
        duration: 100
      })
      .addResult("step2", {
        stepId: "step2",
        success: false,
        data: null,
        error: new Error("Failed"),
        startTime: new Date(),
        endTime: new Date(),
        duration: 200
      })
      .incrementIteration()
      .incrementIteration()
      .incrementError()
    
    const stats = getWorkflowStats(ctx)
    
    expect(stats.totalSteps).toBe(2)
    expect(stats.successfulSteps).toBe(1)
    expect(stats.failedSteps).toBe(1)
    expect(stats.averageStepDuration).toBe(150)
    expect(stats.iterationCount).toBe(2)
    expect(stats.errorCount).toBe(1)
  })
})

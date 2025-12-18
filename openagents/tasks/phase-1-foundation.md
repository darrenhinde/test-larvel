# Phase 1: Foundation

**Estimated Time**: 5 hours  
**Status**: ⏳ Not Started

---

## Overview

Build the core data structures and context management system. This phase establishes the foundation for all workflow functionality.

---

## Tasks

### Task 1.1: Create Type Definitions ⏱️ 1 hour

**File**: `src/workflow/types.ts`

**Objective**: Define all TypeScript interfaces for the workflow system

**Implementation**:
```typescript
// Workflow definition
export interface WorkflowDefinition {
  id: string
  description: string
  max_iterations?: number      // Default: 100
  max_duration_ms?: number     // Default: 300000 (5 min)
  parallel?: boolean
  steps: WorkflowStep[]
  initial_context?: Record<string, any>
}

// Workflow step
export interface WorkflowStep {
  id: string
  type: "agent" | "approval" | "parallel" | "condition" | "transform"
  
  // Agent step
  agent?: string
  
  // Parallel step
  steps?: WorkflowStep[]
  
  // Condition step
  condition?: string
  then?: string
  else?: string
  
  // Transform step
  transform?: string
  
  // Routing
  next?: string
  on_error?: string
  on_approve?: string
  on_reject?: string
  
  // Retry config
  max_retries?: number
  retry_delay_ms?: number
  
  // Timeout
  timeout_ms?: number
  
  // Input reference
  input?: string
}

// Workflow context
export interface WorkflowContext {
  readonly workflowId: string
  readonly startTime: Date
  readonly input: any
  readonly results: ReadonlyMap<string, StepResult>
  readonly metadata: {
    readonly currentStep: string
    readonly previousSteps: readonly string[]
    readonly iterationCount: number
    readonly errorCount: number
  }
  
  addResult(stepId: string, result: StepResult): WorkflowContext
  getResult(stepId: string): StepResult | undefined
  incrementIteration(): WorkflowContext
  incrementError(): WorkflowContext
}

// Step result
export interface StepResult {
  stepId: string
  success: boolean
  data: any
  error?: Error
  startTime: Date
  endTime: Date
  duration: number
}

// Workflow result
export interface WorkflowResult {
  success: boolean
  context: WorkflowContext
  error: Error | null
}

// Step executor interface
export interface StepExecutor {
  execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>
  route(step: WorkflowStep, result: StepResult, context: WorkflowContext): string | null
}

// Safety guard interface
export interface SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void
}
```

**Acceptance Criteria**:
- [ ] All interfaces defined
- [ ] TypeScript compiles without errors
- [ ] Interfaces exported from `types.ts`

---

### Task 1.2: Implement Context Management ⏱️ 2 hours

**File**: `src/workflow/context/context.ts`

**Objective**: Implement immutable context creation and updates

**Implementation**:
```typescript
import type { WorkflowContext, StepResult } from "../types"

/**
 * Create initial workflow context
 */
export function createContext(
  workflowId: string,
  input: any
): WorkflowContext {
  const startTime = new Date()
  
  return {
    workflowId,
    startTime,
    input,
    results: new Map(),
    metadata: {
      currentStep: "",
      previousSteps: [],
      iterationCount: 0,
      errorCount: 0
    },
    
    addResult(stepId: string, result: StepResult): WorkflowContext {
      const newResults = new Map(this.results)
      newResults.set(stepId, result)
      
      return {
        ...this,
        results: newResults,
        metadata: {
          ...this.metadata,
          currentStep: stepId,
          previousSteps: [...this.metadata.previousSteps, stepId]
        }
      }
    },
    
    getResult(stepId: string): StepResult | undefined {
      return this.results.get(stepId)
    },
    
    incrementIteration(): WorkflowContext {
      return {
        ...this,
        metadata: {
          ...this.metadata,
          iterationCount: this.metadata.iterationCount + 1
        }
      }
    },
    
    incrementError(): WorkflowContext {
      return {
        ...this,
        metadata: {
          ...this.metadata,
          errorCount: this.metadata.errorCount + 1
        }
      }
    }
  }
}

/**
 * Build context object for agent input
 */
export function buildContextObject(context: WorkflowContext): Record<string, any> {
  const contextObj: Record<string, any> = {}
  
  for (const [stepId, result] of context.results) {
    if (result.success) {
      contextObj[stepId] = result.data
    }
  }
  
  return contextObj
}
```

**Test File**: `src/workflow/context/context.test.ts`

```typescript
import { describe, it, expect } from "bun:test"
import { createContext, buildContextObject } from "./context"

describe("createContext", () => {
  it("should create initial context", () => {
    const ctx = createContext("test-workflow", { foo: "bar" })
    
    expect(ctx.workflowId).toBe("test-workflow")
    expect(ctx.input).toEqual({ foo: "bar" })
    expect(ctx.results.size).toBe(0)
    expect(ctx.metadata.iterationCount).toBe(0)
    expect(ctx.metadata.errorCount).toBe(0)
  })
  
  it("should add result without mutation", () => {
    const ctx1 = createContext("test", {})
    const result = {
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
    
    // New context has result
    expect(ctx2.results.size).toBe(1)
    expect(ctx2.getResult("step1")).toEqual(result)
    expect(ctx2.metadata.currentStep).toBe("step1")
    expect(ctx2.metadata.previousSteps).toEqual(["step1"])
  })
  
  it("should increment iteration", () => {
    const ctx1 = createContext("test", {})
    const ctx2 = ctx1.incrementIteration()
    const ctx3 = ctx2.incrementIteration()
    
    expect(ctx1.metadata.iterationCount).toBe(0)
    expect(ctx2.metadata.iterationCount).toBe(1)
    expect(ctx3.metadata.iterationCount).toBe(2)
  })
  
  it("should increment error count", () => {
    const ctx1 = createContext("test", {})
    const ctx2 = ctx1.incrementError()
    
    expect(ctx1.metadata.errorCount).toBe(0)
    expect(ctx2.metadata.errorCount).toBe(1)
  })
})

describe("buildContextObject", () => {
  it("should build context object from results", () => {
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
})
```

**Acceptance Criteria**:
- [ ] `createContext()` creates immutable context
- [ ] `addResult()` returns new context without mutation
- [ ] `incrementIteration()` works correctly
- [ ] `incrementError()` works correctly
- [ ] `buildContextObject()` builds context from results
- [ ] All tests pass

---

### Task 1.3: Create Zod Schemas ⏱️ 2 hours

**File**: `src/workflow/schema.ts`

**Objective**: Create Zod schemas for validation

**Implementation**:
```typescript
import { z } from "zod"

export const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.enum(["agent", "approval", "parallel", "condition", "transform"]),
  
  // Agent step
  agent: z.string().optional(),
  
  // Parallel step
  steps: z.lazy(() => z.array(WorkflowStepSchema)).optional(),
  
  // Condition step
  condition: z.string().optional(),
  then: z.string().optional(),
  else: z.string().optional(),
  
  // Transform step
  transform: z.string().optional(),
  
  // Routing
  next: z.string().optional(),
  on_error: z.string().optional(),
  on_approve: z.string().optional(),
  on_reject: z.string().optional(),
  
  // Retry config
  max_retries: z.number().positive().optional(),
  retry_delay_ms: z.number().nonnegative().optional(),
  
  // Timeout
  timeout_ms: z.number().positive().optional(),
  
  // Input reference
  input: z.string().optional(),
  
  // Approval step
  message: z.string().optional()
})

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
  max_iterations: z.number().positive().default(100),
  max_duration_ms: z.number().positive().default(300000),
  parallel: z.boolean().default(false),
  steps: z.array(WorkflowStepSchema).min(1),
  initial_context: z.record(z.any()).optional()
})

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>
```

**Test File**: `src/workflow/schema.test.ts`

```typescript
import { describe, it, expect } from "bun:test"
import { WorkflowDefinitionSchema, WorkflowStepSchema } from "./schema"

describe("WorkflowStepSchema", () => {
  it("should validate agent step", () => {
    const step = {
      id: "test",
      type: "agent",
      agent: "test-agent",
      next: "next-step"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should validate parallel step", () => {
    const step = {
      id: "parallel",
      type: "parallel",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" },
        { id: "step2", type: "agent", agent: "agent2" }
      ]
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should reject invalid step type", () => {
    const step = {
      id: "test",
      type: "invalid"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(false)
  })
})

describe("WorkflowDefinitionSchema", () => {
  it("should validate workflow", () => {
    const workflow = {
      id: "test-workflow",
      description: "Test workflow",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.data.max_iterations).toBe(100)
      expect(result.data.max_duration_ms).toBe(300000)
    }
  })
  
  it("should reject workflow without steps", () => {
    const workflow = {
      id: "test",
      description: "Test",
      steps: []
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(false)
  })
})
```

**Acceptance Criteria**:
- [ ] Schemas validate correct workflows
- [ ] Schemas reject invalid workflows
- [ ] Default values applied correctly
- [ ] All tests pass

---

## Completion Checklist

- [ ] Task 1.1: Type definitions complete
- [ ] Task 1.2: Context management complete
- [ ] Task 1.3: Zod schemas complete
- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Code reviewed
- [ ] Committed to git

---

## Next Phase

Once Phase 1 is complete, proceed to [Phase 2: Basic Execution](./phase-2-basic-execution.md)

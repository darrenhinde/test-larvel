# Workflow System - Detailed Specification v1

**Date**: Dec 18, 2025  
**Focus**: Simple, Modular, Functional, Safe  
**Goal**: Easy-to-build custom workflows with parallel execution and graceful failures

---

## Core Principles

### 1. **Simple** 🎯
- One workflow = one JSON file
- One step = one function call
- Clear input → output flow

### 2. **Modular** 🧩
- Each component has single responsibility
- Easy to add new step types
- Composable building blocks

### 3. **Functional** 🔧
- Pure functions where possible
- Immutable data structures
- Explicit state transitions

### 4. **Safe** 🔒
- Loop protection (max iterations)
- Timeout protection (max duration)
- Graceful failure handling
- Context isolation between steps

### 5. **Performant** ⚡
- Parallel execution by default (where safe)
- Lazy evaluation
- Minimal overhead

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow System                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Workflow   │  │   Context    │  │   Executor   │  │
│  │  Definition  │→ │   Manager    │→ │   Engine     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                  ↓                  ↓          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Step Types  │  │   Safety     │  │   Progress   │  │
│  │  (Nodes)     │  │   Guards     │  │   Tracker    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Workflow Definition (Simple JSON)

### Basic Structure
```typescript
interface WorkflowDefinition {
  id: string
  description: string
  
  // Safety limits
  max_iterations?: number      // Default: 100
  max_duration_ms?: number     // Default: 300000 (5 min)
  
  // Execution mode
  parallel?: boolean           // Default: false
  
  // Steps
  steps: WorkflowStep[]
  
  // Initial context
  initial_context?: Record<string, any>
}

interface WorkflowStep {
  id: string
  type: "agent" | "approval" | "parallel" | "condition" | "transform"
  
  // Agent step
  agent?: string
  
  // Parallel step
  steps?: WorkflowStep[]       // Nested steps for parallel execution
  
  // Condition step
  condition?: string           // JavaScript expression
  then?: string                // Step ID if true
  else?: string                // Step ID if false
  
  // Transform step
  transform?: string           // JavaScript expression
  
  // Routing
  next?: string                // Next step ID
  on_error?: string            // Error handler step ID
  
  // Retry config
  max_retries?: number         // Default: 1
  retry_delay_ms?: number      // Default: 0
  
  // Timeout
  timeout_ms?: number          // Default: 60000 (1 min)
}
```

### Example: Simple Sequential Workflow
```json
{
  "id": "feature-dev",
  "description": "Plan → Code → Test",
  "max_iterations": 50,
  "max_duration_ms": 600000,
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "next": "code",
      "timeout_ms": 120000
    },
    {
      "id": "code",
      "type": "agent",
      "agent": "coder",
      "next": "test",
      "max_retries": 2,
      "on_error": "plan"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "max_retries": 3,
      "on_error": "code"
    }
  ]
}
```

### Example: Parallel Execution
```json
{
  "id": "comprehensive-test",
  "description": "Run all tests in parallel",
  "steps": [
    {
      "id": "parallel-tests",
      "type": "parallel",
      "steps": [
        { "id": "unit", "type": "agent", "agent": "test-unit" },
        { "id": "integration", "type": "agent", "agent": "test-integration" },
        { "id": "e2e", "type": "agent", "agent": "test-e2e" }
      ],
      "next": "report"
    },
    {
      "id": "report",
      "type": "agent",
      "agent": "reporter"
    }
  ]
}
```

### Example: Conditional Branching
```json
{
  "id": "smart-deploy",
  "description": "Deploy based on test results",
  "steps": [
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "next": "check-results"
    },
    {
      "id": "check-results",
      "type": "condition",
      "condition": "context.test.success === true",
      "then": "deploy",
      "else": "notify-failure"
    },
    {
      "id": "deploy",
      "type": "agent",
      "agent": "deployer"
    },
    {
      "id": "notify-failure",
      "type": "agent",
      "agent": "notifier"
    }
  ]
}
```

---

## 2. Context Management (Immutable)

### Context Structure
```typescript
interface WorkflowContext {
  // Immutable core
  readonly workflowId: string
  readonly startTime: Date
  readonly input: any
  
  // Step results (immutable map)
  readonly results: ReadonlyMap<string, StepResult>
  
  // Execution metadata
  readonly metadata: {
    readonly currentStep: string
    readonly previousSteps: readonly string[]
    readonly iterationCount: number
    readonly errorCount: number
  }
  
  // Methods return NEW context (functional)
  addResult(stepId: string, result: StepResult): WorkflowContext
  getResult(stepId: string): StepResult | undefined
  incrementIteration(): WorkflowContext
  incrementError(): WorkflowContext
}

interface StepResult {
  stepId: string
  success: boolean
  data: any
  error?: Error
  startTime: Date
  endTime: Date
  duration: number
}
```

### Implementation (Functional)
```typescript
// Pure function: Create initial context
function createContext(
  workflowId: string,
  input: any
): WorkflowContext {
  return {
    workflowId,
    startTime: new Date(),
    input,
    results: new Map(),
    metadata: {
      currentStep: "",
      previousSteps: [],
      iterationCount: 0,
      errorCount: 0
    },
    
    // Functional updates (return new context)
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
```

---

## 3. Step Types (Modular Nodes)

### Base Step Interface
```typescript
interface StepExecutor {
  // Execute step and return result
  execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult>
  
  // Determine next step based on result
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null
}
```

### Agent Step (Calls OpenAgents)
```typescript
class AgentStepExecutor implements StepExecutor {
  constructor(
    private agentRegistry: Map<string, Agent>
  ) {}
  
  async execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = new Date()
    
    try {
      // Get agent
      const agent = this.agentRegistry.get(step.agent!)
      if (!agent) {
        throw new Error(`Agent not found: ${step.agent}`)
      }
      
      // Prepare input (from context or workflow input)
      const input = this.prepareInput(step, context)
      
      // Execute with retry
      const data = await this.executeWithRetry(
        () => agent.execute(input),
        step.max_retries || 1,
        step.retry_delay_ms || 0
      )
      
      return {
        stepId: step.id,
        success: true,
        data,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
      
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        data: null,
        error: error as Error,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
    }
  }
  
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null {
    if (result.success) {
      return step.next || null
    } else {
      return step.on_error || null
    }
  }
  
  // Pure helper: Prepare input from context
  private prepareInput(
    step: WorkflowStep,
    context: WorkflowContext
  ): any {
    // Use workflow input by default
    return context.input
  }
  
  // Pure helper: Retry logic
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    delayMs: number
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        if (delayMs > 0) {
          await sleep(delayMs * Math.pow(2, i)) // Exponential backoff
        }
      }
    }
    throw new Error("Retry failed")
  }
}
```

### Parallel Step (Concurrent Execution)
```typescript
class ParallelStepExecutor implements StepExecutor {
  constructor(
    private executorRegistry: Map<string, StepExecutor>
  ) {}
  
  async execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = new Date()
    
    try {
      // Execute all nested steps in parallel
      const results = await Promise.allSettled(
        step.steps!.map(nestedStep => {
          const executor = this.getExecutor(nestedStep.type)
          return executor.execute(nestedStep, context)
        })
      )
      
      // Collect results
      const data = results.map((r, i) => ({
        stepId: step.steps![i].id,
        status: r.status,
        result: r.status === "fulfilled" ? r.value : null,
        error: r.status === "rejected" ? r.reason : null
      }))
      
      // Success if all succeeded
      const success = results.every(r => r.status === "fulfilled")
      
      return {
        stepId: step.id,
        success,
        data,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
      
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        data: null,
        error: error as Error,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
    }
  }
  
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null {
    return result.success ? step.next || null : step.on_error || null
  }
  
  private getExecutor(type: string): StepExecutor {
    const executor = this.executorRegistry.get(type)
    if (!executor) {
      throw new Error(`Executor not found for type: ${type}`)
    }
    return executor
  }
}
```

### Approval Step (Human-in-the-Loop)
```typescript
class ApprovalStepExecutor implements StepExecutor {
  constructor(
    private uiManager: UIManager
  ) {}
  
  async execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = new Date()
    
    try {
      // Show approval prompt
      const approved = await this.uiManager.showApprovalPrompt(
        step.message || "Approve?",
        context
      )
      
      return {
        stepId: step.id,
        success: true,
        data: { approved },
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
      
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        data: null,
        error: error as Error,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
    }
  }
  
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null {
    if (result.data?.approved) {
      return step.on_approve || step.next || null
    } else {
      return step.on_reject || null
    }
  }
}
```

### Condition Step (Branching Logic)
```typescript
class ConditionStepExecutor implements StepExecutor {
  async execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = new Date()
    
    try {
      // Evaluate condition (safe eval)
      const result = this.evaluateCondition(step.condition!, context)
      
      return {
        stepId: step.id,
        success: true,
        data: { result },
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
      
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        data: null,
        error: error as Error,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
    }
  }
  
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null {
    if (result.data?.result === true) {
      return step.then || null
    } else {
      return step.else || null
    }
  }
  
  // Safe condition evaluation
  private evaluateCondition(
    condition: string,
    context: WorkflowContext
  ): boolean {
    // Simple expression evaluation (no eval!)
    // Support: context.stepId.field === value
    // Example: context.test.success === true
    
    // Parse expression
    const match = condition.match(/context\.(\w+)\.(\w+)\s*(===|!==|>|<|>=|<=)\s*(.+)/)
    if (!match) {
      throw new Error(`Invalid condition: ${condition}`)
    }
    
    const [, stepId, field, operator, valueStr] = match
    
    // Get value from context
    const stepResult = context.getResult(stepId)
    if (!stepResult) {
      throw new Error(`Step result not found: ${stepId}`)
    }
    
    const actualValue = stepResult.data?.[field]
    const expectedValue = this.parseValue(valueStr.trim())
    
    // Compare
    switch (operator) {
      case "===": return actualValue === expectedValue
      case "!==": return actualValue !== expectedValue
      case ">": return actualValue > expectedValue
      case "<": return actualValue < expectedValue
      case ">=": return actualValue >= expectedValue
      case "<=": return actualValue <= expectedValue
      default: throw new Error(`Unknown operator: ${operator}`)
    }
  }
  
  private parseValue(str: string): any {
    if (str === "true") return true
    if (str === "false") return false
    if (str === "null") return null
    if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1)
    if (!isNaN(Number(str))) return Number(str)
    return str
  }
}
```

---

## 4. Safety Guards (Loop & Timeout Protection)

### Safety Guard Interface
```typescript
interface SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void
}
```

### Iteration Guard (Prevent Infinite Loops)
```typescript
class IterationGuard implements SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void {
    const maxIterations = workflow.max_iterations || 100
    
    if (context.metadata.iterationCount >= maxIterations) {
      throw new Error(
        `Workflow exceeded max iterations: ${maxIterations}. ` +
        `This usually indicates an infinite loop. ` +
        `Check your workflow routing logic.`
      )
    }
  }
}
```

### Duration Guard (Prevent Runaway Workflows)
```typescript
class DurationGuard implements SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void {
    const maxDuration = workflow.max_duration_ms || 300000 // 5 min
    const elapsed = Date.now() - context.startTime.getTime()
    
    if (elapsed >= maxDuration) {
      throw new Error(
        `Workflow exceeded max duration: ${maxDuration}ms. ` +
        `Elapsed: ${elapsed}ms. ` +
        `Consider breaking into smaller workflows.`
      )
    }
  }
}
```

### Error Guard (Prevent Error Cascades)
```typescript
class ErrorGuard implements SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void {
    const maxErrors = 10
    
    if (context.metadata.errorCount >= maxErrors) {
      throw new Error(
        `Workflow exceeded max errors: ${maxErrors}. ` +
        `This indicates a systemic issue. ` +
        `Check your error handling logic.`
      )
    }
  }
}
```

---

## 5. Workflow Executor (Orchestration Engine)

### Main Executor
```typescript
class WorkflowExecutor {
  private executors: Map<string, StepExecutor>
  private guards: SafetyGuard[]
  
  constructor(
    agentRegistry: Map<string, Agent>,
    uiManager: UIManager
  ) {
    // Register step executors
    this.executors = new Map([
      ["agent", new AgentStepExecutor(agentRegistry)],
      ["parallel", new ParallelStepExecutor(this.executors)],
      ["approval", new ApprovalStepExecutor(uiManager)],
      ["condition", new ConditionStepExecutor()]
    ])
    
    // Register safety guards
    this.guards = [
      new IterationGuard(),
      new DurationGuard(),
      new ErrorGuard()
    ]
  }
  
  async execute(
    workflow: WorkflowDefinition,
    input: any
  ): Promise<WorkflowResult> {
    // Create initial context
    let context = createContext(workflow.id, input)
    
    // Get first step
    let currentStep = workflow.steps[0]
    
    try {
      // Execute workflow loop
      while (currentStep) {
        // Check safety guards
        this.checkSafetyGuards(context, workflow)
        
        // Increment iteration
        context = context.incrementIteration()
        
        // Get executor for step type
        const executor = this.executors.get(currentStep.type)
        if (!executor) {
          throw new Error(`Unknown step type: ${currentStep.type}`)
        }
        
        // Execute step
        const result = await executor.execute(currentStep, context)
        
        // Update context with result
        context = context.addResult(currentStep.id, result)
        
        // Track errors
        if (!result.success) {
          context = context.incrementError()
        }
        
        // Determine next step
        const nextStepId = executor.route(currentStep, result, context)
        
        // Find next step
        currentStep = nextStepId
          ? workflow.steps.find(s => s.id === nextStepId) || null
          : null
      }
      
      return {
        success: true,
        context,
        error: null
      }
      
    } catch (error) {
      return {
        success: false,
        context,
        error: error as Error
      }
    }
  }
  
  private checkSafetyGuards(
    context: WorkflowContext,
    workflow: WorkflowDefinition
  ): void {
    for (const guard of this.guards) {
      guard.check(context, workflow)
    }
  }
}

interface WorkflowResult {
  success: boolean
  context: WorkflowContext
  error: Error | null
}
```

---

## 6. Graceful Failure Handling

### Failure Strategies

#### 1. **Step-Level Retry**
```json
{
  "id": "flaky-test",
  "type": "agent",
  "agent": "tester",
  "max_retries": 3,
  "retry_delay_ms": 1000,
  "on_error": "notify"
}
```

#### 2. **Error Recovery Routes**
```json
{
  "id": "code",
  "type": "agent",
  "agent": "coder",
  "next": "test",
  "on_error": "fix"
}
```

#### 3. **Parallel Failure Tolerance**
```json
{
  "id": "parallel-tests",
  "type": "parallel",
  "steps": [
    { "id": "unit", "type": "agent", "agent": "test-unit" },
    { "id": "integration", "type": "agent", "agent": "test-integration" }
  ],
  "next": "report"
}
```
**Behavior:** If one test fails, others continue. Report shows all results.

#### 4. **Timeout Protection**
```json
{
  "id": "slow-task",
  "type": "agent",
  "agent": "analyzer",
  "timeout_ms": 30000,
  "on_error": "skip"
}
```

---

## 7. Testing Strategy

### Unit Tests (Pure Functions)
```typescript
describe("Context Management", () => {
  it("should create immutable context", () => {
    const ctx1 = createContext("test", { foo: "bar" })
    const ctx2 = ctx1.addResult("step1", { success: true, data: "result" })
    
    // Original unchanged
    expect(ctx1.results.size).toBe(0)
    
    // New context has result
    expect(ctx2.results.size).toBe(1)
    expect(ctx2.getResult("step1")?.data).toBe("result")
  })
  
  it("should track iterations", () => {
    const ctx1 = createContext("test", {})
    const ctx2 = ctx1.incrementIteration()
    const ctx3 = ctx2.incrementIteration()
    
    expect(ctx1.metadata.iterationCount).toBe(0)
    expect(ctx2.metadata.iterationCount).toBe(1)
    expect(ctx3.metadata.iterationCount).toBe(2)
  })
})

describe("Safety Guards", () => {
  it("should prevent infinite loops", () => {
    const guard = new IterationGuard()
    const workflow = { max_iterations: 10 } as WorkflowDefinition
    const context = createContext("test", {})
    
    // Simulate 11 iterations
    let ctx = context
    for (let i = 0; i < 11; i++) {
      ctx = ctx.incrementIteration()
    }
    
    expect(() => guard.check(ctx, workflow)).toThrow("exceeded max iterations")
  })
})
```

### Integration Tests (Step Executors)
```typescript
describe("AgentStepExecutor", () => {
  it("should execute agent and return result", async () => {
    const mockAgent = {
      execute: jest.fn().mockResolvedValue({ output: "success" })
    }
    
    const registry = new Map([["test-agent", mockAgent]])
    const executor = new AgentStepExecutor(registry)
    
    const step: WorkflowStep = {
      id: "test",
      type: "agent",
      agent: "test-agent"
    }
    
    const context = createContext("workflow", { input: "test" })
    const result = await executor.execute(step, context)
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ output: "success" })
    expect(mockAgent.execute).toHaveBeenCalledWith({ input: "test" })
  })
  
  it("should retry on failure", async () => {
    const mockAgent = {
      execute: jest.fn()
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"))
        .mockResolvedValue({ output: "success" })
    }
    
    const registry = new Map([["test-agent", mockAgent]])
    const executor = new AgentStepExecutor(registry)
    
    const step: WorkflowStep = {
      id: "test",
      type: "agent",
      agent: "test-agent",
      max_retries: 3
    }
    
    const context = createContext("workflow", {})
    const result = await executor.execute(step, context)
    
    expect(result.success).toBe(true)
    expect(mockAgent.execute).toHaveBeenCalledTimes(3)
  })
})
```

### End-to-End Tests (Full Workflows)
```typescript
describe("WorkflowExecutor", () => {
  it("should execute simple sequential workflow", async () => {
    const workflow: WorkflowDefinition = {
      id: "test-workflow",
      description: "Test",
      steps: [
        { id: "step1", type: "agent", agent: "agent1", next: "step2" },
        { id: "step2", type: "agent", agent: "agent2" }
      ]
    }
    
    const mockAgents = new Map([
      ["agent1", { execute: jest.fn().mockResolvedValue({ data: "result1" }) }],
      ["agent2", { execute: jest.fn().mockResolvedValue({ data: "result2" }) }]
    ])
    
    const executor = new WorkflowExecutor(mockAgents, mockUIManager)
    const result = await executor.execute(workflow, { input: "test" })
    
    expect(result.success).toBe(true)
    expect(result.context.results.size).toBe(2)
    expect(result.context.getResult("step1")?.data).toEqual({ data: "result1" })
    expect(result.context.getResult("step2")?.data).toEqual({ data: "result2" })
  })
  
  it("should handle parallel execution", async () => {
    const workflow: WorkflowDefinition = {
      id: "parallel-test",
      description: "Parallel",
      steps: [
        {
          id: "parallel",
          type: "parallel",
          steps: [
            { id: "p1", type: "agent", agent: "agent1" },
            { id: "p2", type: "agent", agent: "agent2" }
          ]
        }
      ]
    }
    
    const mockAgents = new Map([
      ["agent1", { execute: jest.fn().mockResolvedValue({ data: "r1" }) }],
      ["agent2", { execute: jest.fn().mockResolvedValue({ data: "r2" }) }]
    })
    
    const executor = new WorkflowExecutor(mockAgents, mockUIManager)
    const result = await executor.execute(workflow, {})
    
    expect(result.success).toBe(true)
    expect(result.context.getResult("parallel")?.data).toHaveLength(2)
  })
})
```

---

## 8. File Structure

```
src/
├── workflow/
│   ├── index.ts                 # Public API
│   ├── types.ts                 # TypeScript interfaces
│   ├── schema.ts                # Zod schemas
│   │
│   ├── context/
│   │   ├── context.ts           # Context creation & management
│   │   └── context.test.ts
│   │
│   ├── executors/
│   │   ├── base.ts              # StepExecutor interface
│   │   ├── agent.ts             # AgentStepExecutor
│   │   ├── parallel.ts          # ParallelStepExecutor
│   │   ├── approval.ts          # ApprovalStepExecutor
│   │   ├── condition.ts         # ConditionStepExecutor
│   │   └── *.test.ts
│   │
│   ├── guards/
│   │   ├── base.ts              # SafetyGuard interface
│   │   ├── iteration.ts         # IterationGuard
│   │   ├── duration.ts          # DurationGuard
│   │   ├── error.ts             # ErrorGuard
│   │   └── *.test.ts
│   │
│   ├── executor.ts              # WorkflowExecutor
│   ├── executor.test.ts
│   │
│   └── loader.ts                # Load workflows from config
│
└── features/
    └── workflow.ts              # Integration with OpenAgents
```

---

## 9. Integration with OpenAgents

### Plugin Integration
```typescript
// src/plugin/index.ts

import { WorkflowExecutor } from "../workflow"
import { loadWorkflows } from "../workflow/loader"

const OpenAgentsPlugin: Plugin = async (ctx) => {
  // ... existing code ...
  
  // Load workflows
  const workflows = loadWorkflows(directory, config)
  
  // Create workflow executor
  const workflowExecutor = new WorkflowExecutor(
    agentMap,
    uiManager
  )
  
  // Register workflows as special agents
  for (const [id, workflow] of workflows) {
    const workflowAgent = {
      description: `Workflow: ${workflow.description}`,
      mode: "subagent",
      prompt: `Execute workflow: ${id}`,
      execute: async (input: any) => {
        return await workflowExecutor.execute(workflow, input)
      }
    }
    
    agentMap.set(`workflow:${id}`, workflowAgent)
  }
  
  return { config, event }
}
```

### Configuration
```json
{
  "enabled": true,
  "workflows_dir": "./workflows",
  "workflows": {
    "feature-dev": {
      "enabled": true,
      "visible_to": ["plan", "build"]
    }
  }
}
```

---

## 10. Performance Optimizations

### 1. **Lazy Evaluation**
```typescript
// Only load agents when needed
class LazyAgentRegistry {
  private cache = new Map<string, Agent>()
  
  async get(name: string): Promise<Agent> {
    if (!this.cache.has(name)) {
      const agent = await loadAgent(name)
      this.cache.set(name, agent)
    }
    return this.cache.get(name)!
  }
}
```

### 2. **Parallel by Default (where safe)**
```typescript
// Automatically detect parallelizable steps
function optimizeWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  // Find steps with no dependencies
  const parallelizable = findParallelizableSteps(workflow.steps)
  
  // Group into parallel step
  if (parallelizable.length > 1) {
    return {
      ...workflow,
      steps: [
        {
          id: "auto-parallel",
          type: "parallel",
          steps: parallelizable
        },
        ...workflow.steps.filter(s => !parallelizable.includes(s))
      ]
    }
  }
  
  return workflow
}
```

### 3. **Context Sharing (Efficient)**
```typescript
// Share read-only context between parallel steps
class SharedContext {
  constructor(
    private baseContext: WorkflowContext
  ) {}
  
  // Read-only access
  getResult(stepId: string): StepResult | undefined {
    return this.baseContext.getResult(stepId)
  }
  
  // Writes go to isolated context
  addResult(stepId: string, result: StepResult): WorkflowContext {
    // Create new context (immutable)
    return this.baseContext.addResult(stepId, result)
  }
}
```

---

## Summary

### ✅ **Simple**
- One workflow = one JSON file
- Clear step types (agent, parallel, approval, condition)
- Straightforward routing (next, on_error)

### ✅ **Modular**
- Each step type is a separate executor
- Easy to add new step types
- Composable (parallel steps can contain any step type)

### ✅ **Functional**
- Immutable context
- Pure functions for context operations
- Explicit state transitions

### ✅ **Safe**
- Loop protection (max_iterations)
- Timeout protection (max_duration_ms, timeout_ms)
- Error protection (max_retries, on_error)
- Graceful failures (Promise.allSettled for parallel)

### ✅ **Performant**
- Parallel execution support
- Lazy agent loading
- Minimal overhead (~50ms per step)

### ✅ **Testable**
- Pure functions easy to test
- Mock agents for integration tests
- End-to-end workflow tests

---

**Next Steps:**
1. Review this spec
2. Approve approach
3. Start implementation (Phase 1: Core)

**Questions?**
- Is the JSON format simple enough?
- Are the safety guards sufficient?
- Should we add more step types?
- Any concerns about performance?

# Workflow System - Implementation Roadmap

**Date**: Dec 18, 2025  
**Goal**: Step-by-step implementation plan with clear milestones

---

## Overview

This roadmap breaks down the workflow system implementation into **small, testable increments**. Each phase builds on the previous one and can be tested independently.

---

## Phase 1: Foundation (Days 1-2)

### Goal: Core data structures and context management

### Tasks

#### 1.1 Create Type Definitions
**File:** `src/workflow/types.ts`

```typescript
export interface WorkflowDefinition { ... }
export interface WorkflowStep { ... }
export interface WorkflowContext { ... }
export interface StepResult { ... }
export interface StepExecutor { ... }
```

**Test:** Type checking passes  
**Time:** 1 hour

---

#### 1.2 Implement Context Management
**File:** `src/workflow/context/context.ts`

```typescript
export function createContext(workflowId: string, input: any): WorkflowContext
```

**Features:**
- Immutable context creation
- `addResult()` returns new context
- `getResult()` retrieves step results
- `incrementIteration()` tracks loops
- `incrementError()` tracks failures

**Test:** `src/workflow/context/context.test.ts`
```typescript
describe("Context", () => {
  it("creates immutable context")
  it("adds results without mutation")
  it("tracks iterations")
  it("tracks errors")
})
```

**Time:** 2 hours

---

#### 1.3 Create Zod Schemas
**File:** `src/workflow/schema.ts`

```typescript
export const WorkflowStepSchema = z.object({ ... })
export const WorkflowDefinitionSchema = z.object({ ... })
```

**Features:**
- Validate workflow JSON
- Type inference from schemas
- Clear error messages

**Test:** `src/workflow/schema.test.ts`
```typescript
describe("Schema", () => {
  it("validates valid workflow")
  it("rejects invalid workflow")
  it("provides clear error messages")
})
```

**Time:** 2 hours

---

### Milestone 1: ✅ Foundation Complete
- [ ] Types defined
- [ ] Context management working
- [ ] Schemas validating
- [ ] All tests passing

**Total Time:** ~5 hours

---

## Phase 2: Basic Execution (Days 3-4)

### Goal: Execute simple sequential workflows

### Tasks

#### 2.1 Implement Base Executor Interface
**File:** `src/workflow/executors/base.ts`

```typescript
export interface StepExecutor {
  execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>
  route(step: WorkflowStep, result: StepResult, context: WorkflowContext): string | null
}
```

**Time:** 30 minutes

---

#### 2.2 Implement Agent Step Executor
**File:** `src/workflow/executors/agent.ts`

```typescript
export class AgentStepExecutor implements StepExecutor {
  async execute(step, context): Promise<StepResult>
  route(step, result, context): string | null
  private executeWithRetry(fn, maxRetries, delay): Promise<any>
}
```

**Features:**
- Execute OpenAgents agents
- Retry logic with exponential backoff
- Timeout handling
- Error capture

**Test:** `src/workflow/executors/agent.test.ts`
```typescript
describe("AgentStepExecutor", () => {
  it("executes agent successfully")
  it("retries on failure")
  it("respects max retries")
  it("handles timeout")
  it("routes on success")
  it("routes on error")
})
```

**Time:** 3 hours

---

#### 2.3 Implement Workflow Executor
**File:** `src/workflow/executor.ts`

```typescript
export class WorkflowExecutor {
  async execute(workflow: WorkflowDefinition, input: any): Promise<WorkflowResult>
  private getExecutor(type: string): StepExecutor
  private getNextStep(workflow, current, action): WorkflowStep | null
}
```

**Features:**
- Execute workflow loop
- Route between steps
- Track context
- Handle errors

**Test:** `src/workflow/executor.test.ts`
```typescript
describe("WorkflowExecutor", () => {
  it("executes single step workflow")
  it("executes sequential workflow")
  it("routes on success")
  it("routes on error")
  it("handles missing steps")
})
```

**Time:** 3 hours

---

### Milestone 2: ✅ Basic Execution Complete
- [ ] Agent executor working
- [ ] Workflow executor working
- [ ] Sequential workflows execute
- [ ] Error routing works
- [ ] All tests passing

**Total Time:** ~6.5 hours

---

## Phase 3: Safety Guards (Day 5)

### Goal: Prevent infinite loops and runaway workflows

### Tasks

#### 3.1 Implement Safety Guard Interface
**File:** `src/workflow/guards/base.ts`

```typescript
export interface SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void
}
```

**Time:** 15 minutes

---

#### 3.2 Implement Iteration Guard
**File:** `src/workflow/guards/iteration.ts`

```typescript
export class IterationGuard implements SafetyGuard {
  check(context, workflow): void
}
```

**Test:** `src/workflow/guards/iteration.test.ts`
```typescript
describe("IterationGuard", () => {
  it("allows under limit")
  it("throws at limit")
  it("provides helpful error message")
})
```

**Time:** 1 hour

---

#### 3.3 Implement Duration Guard
**File:** `src/workflow/guards/duration.ts`

```typescript
export class DurationGuard implements SafetyGuard {
  check(context, workflow): void
}
```

**Test:** `src/workflow/guards/duration.test.ts`

**Time:** 1 hour

---

#### 3.4 Implement Error Guard
**File:** `src/workflow/guards/error.ts`

```typescript
export class ErrorGuard implements SafetyGuard {
  check(context, workflow): void
}
```

**Test:** `src/workflow/guards/error.test.ts`

**Time:** 1 hour

---

#### 3.5 Integrate Guards into Executor
**File:** `src/workflow/executor.ts`

```typescript
class WorkflowExecutor {
  private guards: SafetyGuard[]
  
  private checkSafetyGuards(context, workflow): void {
    for (const guard of this.guards) {
      guard.check(context, workflow)
    }
  }
}
```

**Test:** Update `executor.test.ts`
```typescript
describe("WorkflowExecutor Safety", () => {
  it("prevents infinite loops")
  it("prevents runaway workflows")
  it("prevents error cascades")
})
```

**Time:** 1 hour

---

### Milestone 3: ✅ Safety Guards Complete
- [ ] Iteration guard working
- [ ] Duration guard working
- [ ] Error guard working
- [ ] Guards integrated
- [ ] All tests passing

**Total Time:** ~4 hours

---

## Phase 4: Advanced Step Types (Days 6-7)

### Goal: Add parallel, approval, and condition steps

### Tasks

#### 4.1 Implement Parallel Step Executor
**File:** `src/workflow/executors/parallel.ts`

```typescript
export class ParallelStepExecutor implements StepExecutor {
  async execute(step, context): Promise<StepResult>
  route(step, result, context): string | null
}
```

**Features:**
- Execute nested steps in parallel
- Use `Promise.allSettled()` for graceful failures
- Collect all results
- Success if all succeed

**Test:** `src/workflow/executors/parallel.test.ts`
```typescript
describe("ParallelStepExecutor", () => {
  it("executes steps in parallel")
  it("waits for all to complete")
  it("handles partial failures")
  it("collects all results")
})
```

**Time:** 3 hours

---

#### 4.2 Implement Approval Step Executor
**File:** `src/workflow/executors/approval.ts`

```typescript
export class ApprovalStepExecutor implements StepExecutor {
  async execute(step, context): Promise<StepResult>
  route(step, result, context): string | null
}
```

**Features:**
- Show approval prompt via UIManager
- Wait for user response
- Route based on approval/rejection

**Test:** `src/workflow/executors/approval.test.ts`
```typescript
describe("ApprovalStepExecutor", () => {
  it("shows approval prompt")
  it("routes on approve")
  it("routes on reject")
})
```

**Time:** 2 hours

---

#### 4.3 Implement Condition Step Executor
**File:** `src/workflow/executors/condition.ts`

```typescript
export class ConditionStepExecutor implements StepExecutor {
  async execute(step, context): Promise<StepResult>
  route(step, result, context): string | null
  private evaluateCondition(condition, context): boolean
}
```

**Features:**
- Safe condition evaluation (no eval!)
- Support simple expressions
- Route based on true/false

**Test:** `src/workflow/executors/condition.test.ts`
```typescript
describe("ConditionStepExecutor", () => {
  it("evaluates simple conditions")
  it("routes on true")
  it("routes on false")
  it("handles invalid conditions")
})
```

**Time:** 3 hours

---

#### 4.4 Update Executor Registry
**File:** `src/workflow/executor.ts`

```typescript
constructor() {
  this.executors = new Map([
    ["agent", new AgentStepExecutor(...)],
    ["parallel", new ParallelStepExecutor(...)],
    ["approval", new ApprovalStepExecutor(...)],
    ["condition", new ConditionStepExecutor()]
  ])
}
```

**Test:** Update `executor.test.ts`
```typescript
describe("WorkflowExecutor Advanced", () => {
  it("executes parallel workflows")
  it("handles approval gates")
  it("handles conditional branching")
})
```

**Time:** 1 hour

---

### Milestone 4: ✅ Advanced Steps Complete
- [ ] Parallel execution working
- [ ] Approval gates working
- [ ] Conditional branching working
- [ ] All step types integrated
- [ ] All tests passing

**Total Time:** ~9 hours

---

## Phase 5: Configuration Integration (Days 8-9)

### Goal: Load workflows from config files

### Tasks

#### 5.1 Implement Workflow Loader
**File:** `src/workflow/loader.ts`

```typescript
export function loadWorkflows(
  directory: string,
  config: OpenAgentsConfig
): Map<string, WorkflowDefinition>

export function loadWorkflowFromFile(
  filePath: string
): WorkflowDefinition | null

export function validateWorkflow(
  workflow: WorkflowDefinition
): ValidationResult
```

**Features:**
- Load from `.openagents/workflows/`
- Validate with Zod schema
- Handle errors gracefully
- Support JSON and YAML

**Test:** `src/workflow/loader.test.ts`
```typescript
describe("WorkflowLoader", () => {
  it("loads valid workflow")
  it("validates workflow schema")
  it("handles missing files")
  it("handles invalid JSON")
})
```

**Time:** 3 hours

---

#### 5.2 Update Config Schema
**File:** `src/plugin/config.ts`

```typescript
export const OpenAgentsConfigSchema = z.object({
  // ... existing ...
  workflows_dir: z.string().default("./workflows"),
  workflows: z.record(WorkflowConfigSchema).optional()
})

const WorkflowConfigSchema = z.object({
  enabled: z.boolean().default(true),
  visible_to: z.array(z.string()).optional()
})
```

**Time:** 1 hour

---

#### 5.3 Integrate with Plugin
**File:** `src/plugin/index.ts`

```typescript
// Load workflows
const workflows = loadWorkflows(directory, config)

// Create workflow executor
const workflowExecutor = new WorkflowExecutor(agentMap, uiManager)

// Register workflows as agents
for (const [id, workflow] of workflows) {
  agentMap.set(`workflow:${id}`, createWorkflowAgent(workflow, workflowExecutor))
}
```

**Time:** 2 hours

---

#### 5.4 Add Example Workflows
**Files:** `.openagents/workflows/*.json`

Create example workflows:
- `feature-dev.json` - Sequential workflow
- `comprehensive-test.json` - Parallel workflow
- `smart-deploy.json` - Conditional workflow

**Time:** 1 hour

---

### Milestone 5: ✅ Configuration Integration Complete
- [ ] Workflow loader working
- [ ] Config schema updated
- [ ] Plugin integration working
- [ ] Example workflows created
- [ ] All tests passing

**Total Time:** ~7 hours

---

## Phase 6: CLI & Documentation (Days 10-11)

### Goal: CLI commands and comprehensive documentation

### Tasks

#### 6.1 Add CLI Commands
**File:** `src/cli/workflow.ts` (if applicable)

```bash
opencode workflow list
opencode workflow show <id>
opencode workflow run <id> --input <json>
opencode workflow validate <id>
```

**Time:** 3 hours

---

#### 6.2 Write Workflow Guide
**File:** `WORKFLOW-GUIDE.md`

**Sections:**
- Introduction
- Quick start
- Step types reference
- Safety features
- Best practices
- Troubleshooting

**Time:** 3 hours

---

#### 6.3 Create Cookbook Examples
**File:** `WORKFLOW-COOKBOOK.md`

**Examples:**
- Feature development workflow
- Bug fix workflow
- Refactoring workflow
- Testing workflow
- Deployment workflow

**Time:** 2 hours

---

#### 6.4 Update Main README
**File:** `README.md`

Add workflow section with:
- Overview
- Quick example
- Link to guide

**Time:** 1 hour

---

### Milestone 6: ✅ CLI & Documentation Complete
- [ ] CLI commands working
- [ ] Workflow guide written
- [ ] Cookbook examples created
- [ ] README updated
- [ ] All documentation reviewed

**Total Time:** ~9 hours

---

## Summary

### Total Implementation Time
- Phase 1: Foundation - 5 hours
- Phase 2: Basic Execution - 6.5 hours
- Phase 3: Safety Guards - 4 hours
- Phase 4: Advanced Steps - 9 hours
- Phase 5: Configuration - 7 hours
- Phase 6: CLI & Docs - 9 hours

**Total: ~40.5 hours (~5 days of focused work)**

---

## Testing Strategy

### Unit Tests (Per Module)
- Context management
- Each step executor
- Each safety guard
- Workflow loader

### Integration Tests
- Workflow executor with real agents
- Configuration loading
- Plugin integration

### End-to-End Tests
- Complete workflows
- Error scenarios
- Safety guard triggers

### Test Coverage Goal
- [ ] 90%+ code coverage
- [ ] All edge cases covered
- [ ] Performance benchmarks

---

## Success Criteria

### Functionality
- [ ] Sequential workflows execute correctly
- [ ] Parallel workflows execute concurrently
- [ ] Approval gates block execution
- [ ] Conditional branching works
- [ ] Error routing works
- [ ] Retry logic works

### Safety
- [ ] Infinite loops prevented
- [ ] Runaway workflows prevented
- [ ] Error cascades prevented
- [ ] Graceful failures work

### Performance
- [ ] <50ms overhead per step
- [ ] Parallel execution faster than sequential
- [ ] No memory leaks

### Usability
- [ ] Clear error messages
- [ ] Easy to write workflows
- [ ] Good documentation
- [ ] Example workflows work

---

## Risk Mitigation

### Risk 1: Complexity Creep
**Mitigation:** Stick to spec, defer advanced features

### Risk 2: Performance Issues
**Mitigation:** Benchmark each phase, optimize hot paths

### Risk 3: Breaking Changes
**Mitigation:** Opt-in feature, comprehensive tests

### Risk 4: User Confusion
**Mitigation:** Excellent docs, clear examples

---

## Next Steps

1. **Review this roadmap** ✅
2. **Approve approach** ⏳
3. **Start Phase 1** ⏳
4. **Daily progress updates** ⏳
5. **Milestone reviews** ⏳

---

**Ready to start implementation?**

# OpenAgents Workflow System - Final Implementation Plan

**Date**: Dec 18, 2025  
**Status**: ✅ Ready for Implementation  
**Estimated Time**: 40 hours (~5 days of focused work)

---

## 📋 Executive Summary

This document consolidates all planning discussions into a **single, actionable implementation plan** for adding workflow orchestration to OpenAgents.

### What We're Building

A **simple, modular, functional workflow system** that enables users to:
- Define workflows in JSON (declarative, no code required)
- Orchestrate multi-agent tasks (sequential, parallel, conditional)
- Pass context automatically between steps
- Include approval gates (human-in-the-loop)
- Handle failures gracefully (retry logic, error routing)
- Prevent infinite loops and runaway workflows (safety guards)

### Key Design Principles

1. **Simple** - One workflow = one JSON file
2. **Modular** - Each component has single responsibility
3. **Functional** - Pure functions, immutable data structures
4. **Safe** - Loop protection, timeouts, graceful failures
5. **Performant** - Parallel execution, lazy loading, <50ms overhead

---

## 🎯 Core Features

### 1. Workflow Definition (JSON)

```json
{
  "id": "feature-development",
  "description": "Complete feature development workflow",
  "max_iterations": 100,
  "max_duration_ms": 300000,
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "next": "approve"
    },
    {
      "id": "approve",
      "type": "approval",
      "message": "Approve plan?",
      "on_approve": "code",
      "on_reject": "plan"
    },
    {
      "id": "code",
      "type": "agent",
      "agent": "coder",
      "input": "plan",
      "max_retries": 2,
      "next": "test",
      "on_error": "plan"
    },
    {
      "id": "test",
      "type": "parallel",
      "steps": [
        { "id": "unit", "type": "agent", "agent": "test-unit" },
        { "id": "integration", "type": "agent", "agent": "test-integration" }
      ],
      "next": "review"
    },
    {
      "id": "review",
      "type": "agent",
      "agent": "reviewer",
      "input": "code"
    }
  ]
}
```

### 2. Automatic Context Passing

**Every step automatically receives all previous step results:**

```typescript
// What the "coder" agent receives:
{
  input: "Build feature X",           // Original workflow input
  plan: {                              // Explicitly referenced via "input": "plan"
    files: ["theme.ts", "toggle.tsx"],
    approach: "CSS variables"
  },
  context: {                           // Full context (all previous steps)
    plan: { files: [...], approach: "..." }
  }
}
```

### 3. Step Types

| Type | Purpose | Example |
|------|---------|---------|
| **agent** | Execute OpenAgents agent | `{ "type": "agent", "agent": "coder" }` |
| **parallel** | Run multiple steps concurrently | `{ "type": "parallel", "steps": [...] }` |
| **approval** | Human-in-the-loop gate | `{ "type": "approval", "message": "Approve?" }` |
| **condition** | Conditional branching | `{ "type": "condition", "condition": "..." }` |
| **transform** | Data manipulation | `{ "type": "transform", "transform": "..." }` |

### 4. Safety Guards

| Guard | Purpose | Default |
|-------|---------|---------|
| **IterationGuard** | Prevent infinite loops | max_iterations: 100 |
| **DurationGuard** | Prevent runaway workflows | max_duration_ms: 300000 (5 min) |
| **ErrorGuard** | Prevent error cascades | max_errors: 10 |

### 5. Graceful Failure Handling

- **Step-level retry** with exponential backoff
- **Error recovery routes** (`on_error` routing)
- **Parallel failure tolerance** (Promise.allSettled)
- **Timeout protection** per step

---

## 🏗️ Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow System                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Workflow   │  │   Context    │  │   Executor   │  │
│  │  Definition  │→ │   Manager    │→ │   Engine     │  │
│  │   (JSON)     │  │  (Immutable) │  │ (Orchestrate)│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                  ↓                  ↓          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Step Types  │  │   Safety     │  │   Progress   │  │
│  │  (Executors) │  │   Guards     │  │   Tracker    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### File Structure

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
│   │   ├── transform.ts         # TransformStepExecutor
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
│   └── loader.ts                # Load workflows from config
│
└── plugin/
    └── index.ts                 # Integration with OpenAgents
```

---

## 📅 Implementation Plan

### Phase 1: Foundation (5 hours)
**Goal**: Core data structures and context management

**Tasks**:
1. Create type definitions (`types.ts`)
2. Implement context management (`context/context.ts`)
3. Create Zod schemas (`schema.ts`)
4. Write unit tests

**Deliverable**: Immutable context with type-safe interfaces

---

### Phase 2: Basic Execution (6.5 hours)
**Goal**: Execute simple sequential workflows

**Tasks**:
1. Implement base executor interface (`executors/base.ts`)
2. Implement agent step executor (`executors/agent.ts`)
3. Implement workflow executor (`executor.ts`)
4. Write unit tests

**Deliverable**: Sequential workflows execute correctly

---

### Phase 3: Safety Guards (4 hours)
**Goal**: Prevent infinite loops and runaway workflows

**Tasks**:
1. Implement safety guard interface (`guards/base.ts`)
2. Implement iteration guard (`guards/iteration.ts`)
3. Implement duration guard (`guards/duration.ts`)
4. Implement error guard (`guards/error.ts`)
5. Integrate guards into executor
6. Write unit tests

**Deliverable**: Safety guards prevent common issues

---

### Phase 4: Advanced Step Types (9 hours)
**Goal**: Add parallel, approval, condition, and transform steps

**Tasks**:
1. Implement parallel step executor (`executors/parallel.ts`)
2. Implement approval step executor (`executors/approval.ts`)
3. Implement condition step executor (`executors/condition.ts`)
4. Implement transform step executor (`executors/transform.ts`)
5. Update executor registry
6. Write unit tests

**Deliverable**: All step types working

---

### Phase 5: Configuration Integration (7 hours)
**Goal**: Load workflows from config and integrate with plugin

**Tasks**:
1. Implement workflow loader (`loader.ts`)
2. Update config schema (`plugin/config.ts`)
3. Integrate with plugin (`plugin/index.ts`)
4. Create example workflows
5. Write integration tests

**Deliverable**: Workflows load from config and execute

---

### Phase 6: Documentation & Polish (9 hours)
**Goal**: Complete documentation and final testing

**Tasks**:
1. Write workflow guide (`WORKFLOW-GUIDE.md`)
2. Create cookbook examples (`WORKFLOW-COOKBOOK.md`)
3. Update main README
4. Add CLI commands (if applicable)
5. Final testing and bug fixes

**Deliverable**: Production-ready system with docs

---

## 📊 Progress Tracking

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Phase 1: Foundation | 4 | 5h | ⏳ Not Started |
| Phase 2: Basic Execution | 4 | 6.5h | ⏳ Not Started |
| Phase 3: Safety Guards | 6 | 4h | ⏳ Not Started |
| Phase 4: Advanced Steps | 6 | 9h | ⏳ Not Started |
| Phase 5: Configuration | 5 | 7h | ⏳ Not Started |
| Phase 6: Documentation | 5 | 9h | ⏳ Not Started |
| **Total** | **30** | **40.5h** | **0%** |

---

## 🎯 Success Criteria

### Functionality ✅
- [ ] Sequential workflows execute correctly
- [ ] Parallel workflows execute concurrently
- [ ] Approval gates block execution
- [ ] Conditional branching works
- [ ] Context passes between steps automatically
- [ ] Error routing works
- [ ] Retry logic works

### Safety 🔒
- [ ] Infinite loops prevented
- [ ] Runaway workflows prevented
- [ ] Error cascades prevented
- [ ] Graceful failures work

### Performance ⚡
- [ ] <50ms overhead per step
- [ ] Parallel execution faster than sequential
- [ ] No memory leaks

### Quality 📝
- [ ] 90%+ test coverage
- [ ] All edge cases covered
- [ ] Clear error messages
- [ ] Good documentation

---

## 🔑 Key Concepts

### 1. Immutable Context

**Context is never mutated - each step creates a new context:**

```typescript
const ctx1 = createContext("workflow", input)
const ctx2 = ctx1.addResult("step1", result)  // Returns NEW context
const ctx3 = ctx2.incrementIteration()        // Returns NEW context
```

**Benefits**:
- No race conditions
- Easy to debug (can inspect any point in time)
- Functional programming patterns
- Thread-safe for parallel execution

---

### 2. Automatic Context Injection

**Every step automatically receives all previous results:**

```typescript
// Step 1: Plan
// Returns: { files: [...], approach: "..." }

// Step 2: Code
// Receives:
{
  input: "Build feature X",
  context: {
    plan: { files: [...], approach: "..." }  // ← Automatic
  }
}

// Step 3: Test
// Receives:
{
  input: "Build feature X",
  context: {
    plan: { ... },
    code: { filesCreated: [...] }  // ← Automatic
  }
}
```

**Benefits**:
- No manual wiring needed
- Steps can access any previous result
- Clear data flow
- Easy to understand

---

### 3. Explicit References

**Steps can explicitly reference specific previous steps:**

```json
{
  "id": "code",
  "type": "agent",
  "agent": "coder",
  "input": "plan",  // ← Explicit reference
  "next": "test"
}
```

**Coder receives:**
```typescript
{
  input: "Build feature X",
  plan: { files: [...], approach: "..." },  // ← Explicitly referenced
  context: { plan: { ... } }                 // ← Full context still available
}
```

**Benefits**:
- Clear dependencies
- Easier to write agent prompts
- Self-documenting workflows

---

### 4. Parallel Isolation

**Parallel steps share read-only context but cannot see each other:**

```json
{
  "id": "parallel-tests",
  "type": "parallel",
  "steps": [
    { "id": "unit", "type": "agent", "agent": "test-unit" },
    { "id": "integration", "type": "agent", "agent": "test-integration" }
  ]
}
```

**Each parallel step receives:**
```typescript
{
  input: "...",
  context: { code: { ... } }  // ← Same context (read-only)
}
```

**After parallel step completes:**
```typescript
context.results["parallel-tests"] = {
  data: [
    { stepId: "unit", result: { passed: 15 } },
    { stepId: "integration", result: { passed: 5 } }
  ]
}
```

**Benefits**:
- No race conditions
- Safe concurrent execution
- Results collected after all complete

---

### 5. Safety Guards

**Prevent common workflow issues:**

```typescript
// Iteration Guard - Prevent infinite loops
if (context.metadata.iterationCount >= workflow.max_iterations) {
  throw new Error("Exceeded max iterations - infinite loop detected")
}

// Duration Guard - Prevent runaway workflows
const elapsed = Date.now() - context.startTime.getTime()
if (elapsed >= workflow.max_duration_ms) {
  throw new Error("Workflow timeout - exceeded max duration")
}

// Error Guard - Prevent error cascades
if (context.metadata.errorCount >= maxErrors) {
  throw new Error("Exceeded max errors - systemic issue detected")
}
```

**Benefits**:
- Fail fast with clear errors
- Prevent resource exhaustion
- Easy to debug issues

---

## 📚 Example Workflows

### Example 1: Simple Sequential

```json
{
  "id": "feature-dev",
  "description": "Plan → Code → Test",
  "steps": [
    { "id": "plan", "type": "agent", "agent": "planner", "next": "code" },
    { "id": "code", "type": "agent", "agent": "coder", "next": "test" },
    { "id": "test", "type": "agent", "agent": "tester" }
  ]
}
```

---

### Example 2: With Approval Gate

```json
{
  "id": "deploy-workflow",
  "description": "Build → Test → Approve → Deploy",
  "steps": [
    { "id": "build", "type": "agent", "agent": "builder", "next": "test" },
    { "id": "test", "type": "agent", "agent": "tester", "next": "approve" },
    {
      "id": "approve",
      "type": "approval",
      "message": "Deploy to production?",
      "on_approve": "deploy",
      "on_reject": "end"
    },
    { "id": "deploy", "type": "agent", "agent": "deployer" }
  ]
}
```

---

### Example 3: Parallel Execution

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
    { "id": "report", "type": "agent", "agent": "reporter" }
  ]
}
```

---

### Example 4: Conditional Branching

```json
{
  "id": "smart-deploy",
  "description": "Deploy based on test results",
  "steps": [
    { "id": "test", "type": "agent", "agent": "tester", "next": "check" },
    {
      "id": "check",
      "type": "condition",
      "condition": "context.test.success === true",
      "then": "deploy",
      "else": "notify"
    },
    { "id": "deploy", "type": "agent", "agent": "deployer" },
    { "id": "notify", "type": "agent", "agent": "notifier" }
  ]
}
```

---

### Example 5: Error Recovery

```json
{
  "id": "resilient-workflow",
  "description": "Workflow with retry and error recovery",
  "steps": [
    { "id": "plan", "type": "agent", "agent": "planner", "next": "code" },
    {
      "id": "code",
      "type": "agent",
      "agent": "coder",
      "max_retries": 2,
      "retry_delay_ms": 1000,
      "next": "test",
      "on_error": "plan"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "max_retries": 3,
      "next": "end",
      "on_error": "code"
    }
  ]
}
```

---

## 🔗 Related Documents

### Planning Documents (Read First)
1. **[planning/WORKFLOW-SPEC-V1.md](./planning/WORKFLOW-SPEC-V1.md)** - Complete technical specification
2. **[planning/CONTEXT-PASSING-SPEC.md](./planning/CONTEXT-PASSING-SPEC.md)** - Context passing details
3. **[planning/context-flow-example.md](./planning/context-flow-example.md)** - Visual examples
4. **[planning/IMPLEMENTATION-ROADMAP.md](./planning/IMPLEMENTATION-ROADMAP.md)** - Detailed roadmap

### Task Breakdown
1. **[tasks/OVERVIEW.md](./tasks/OVERVIEW.md)** - Task overview and progress tracking
2. **[tasks/phase-1-foundation.md](./tasks/phase-1-foundation.md)** - Phase 1 detailed tasks
3. **[tasks/phase-2-basic-execution.md](./tasks/phase-2-basic-execution.md)** - Phase 2 detailed tasks
4. **[tasks/phase-3-safety-guards.md](./tasks/phase-3-safety-guards.md)** - Phase 3 detailed tasks
5. **[tasks/phase-4-advanced-steps.md](./tasks/phase-4-advanced-steps.md)** - Phase 4 detailed tasks
6. **[tasks/phase-5-configuration.md](./tasks/phase-5-configuration.md)** - Phase 5 detailed tasks
7. **[tasks/phase-6-documentation.md](./tasks/phase-6-documentation.md)** - Phase 6 detailed tasks

---

## 🚀 Getting Started

### Step 1: Review Planning Documents
1. Read [WORKFLOW-SPEC-V1.md](./planning/WORKFLOW-SPEC-V1.md) - Understand the design
2. Read [CONTEXT-PASSING-SPEC.md](./planning/CONTEXT-PASSING-SPEC.md) - Understand context flow
3. Review [context-flow-example.md](./planning/context-flow-example.md) - See visual examples

### Step 2: Set Up Development Environment
```bash
# Create feature branch
git checkout -b feature/workflow-system

# Install dependencies (if needed)
cd openagents
bun install

# Run existing tests to ensure baseline
bun test
```

### Step 3: Start Implementation
1. Go to [tasks/OVERVIEW.md](./tasks/OVERVIEW.md)
2. Start with [Phase 1: Foundation](./tasks/phase-1-foundation.md)
3. Complete tasks in order
4. Run tests after each task
5. Commit frequently with clear messages

### Step 4: Progress Through Phases
- Complete one phase at a time
- Run all tests before moving to next phase
- Update progress in [tasks/OVERVIEW.md](./tasks/OVERVIEW.md)
- Ask for review at phase boundaries

---

## ✅ Definition of Done

A phase is complete when:
- [ ] All tasks in phase completed
- [ ] All unit tests passing
- [ ] All integration tests passing (if applicable)
- [ ] TypeScript compiles without errors
- [ ] Code reviewed
- [ ] Changes committed to git
- [ ] Progress updated in OVERVIEW.md

The entire project is complete when:
- [ ] All 6 phases complete
- [ ] All success criteria met
- [ ] Documentation complete
- [ ] Example workflows working
- [ ] Ready for production use

---

## 🎉 Summary

This plan provides everything needed to implement the workflow system:

✅ **Clear Goal** - Simple, modular, functional workflow orchestration  
✅ **Complete Design** - All components specified  
✅ **Detailed Tasks** - 30 tasks across 6 phases  
✅ **Time Estimates** - ~40 hours total  
✅ **Success Criteria** - Clear definition of done  
✅ **Examples** - 5 example workflows  
✅ **Documentation** - Comprehensive planning docs  

**Ready to start? Begin with [tasks/phase-1-foundation.md](./tasks/phase-1-foundation.md)** 🚀

# Workflow Creation Guide

## Overview

This guide explains how to create, configure, and execute workflows in OpenAgents. Workflows orchestrate multiple agents to complete complex tasks through a declarative JSON/TypeScript format.

## Table of Contents

1. [Basic Concepts](#basic-concepts)
2. [Workflow Structure](#workflow-structure)
3. [Step Types](#step-types)
4. [Context & Data Flow](#context--data-flow)
5. [Error Handling](#error-handling)
6. [Advanced Features](#advanced-features)
7. [Limitations](#limitations)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

## Basic Concepts

### What is a Workflow?

A **workflow** is a declarative definition of steps that execute in sequence or parallel to accomplish a goal. Each step can:

- Execute an agent
- Transform data
- Make decisions
- Request approval
- Run in parallel

### Workflow Execution Model

```
Input → Step 1 → Step 2 → Step 3 → Result
         ↓        ↓        ↓
      Context  Context  Context
```

Each step:
1. Receives the workflow context (input + previous results)
2. Executes its task
3. Adds its result to the context
4. Routes to the next step

## Workflow Structure

### Minimal Workflow

```typescript
const workflow: WorkflowDefinition = {
  id: "simple-workflow",
  description: "A simple workflow",
  steps: [
    { id: "step1", type: "agent", agent: "planner" }
  ]
}
```

### Complete Workflow

```typescript
const workflow: WorkflowDefinition = {
  // Required fields
  id: "feature-workflow",
  description: "Build a feature: Plan → Code → Test",
  steps: [
    { id: "plan", type: "agent", agent: "planner", next: "code" },
    { id: "code", type: "agent", agent: "coder", next: "test" },
    { id: "test", type: "agent", agent: "tester" }
  ],
  
  // Optional configuration
  max_iterations: 100,           // Prevent infinite loops
  max_duration_ms: 300000,       // 5 minute timeout
  max_context_size: 100,         // Keep last 100 results
  context_retention: "all",      // "all" | "recent" | "referenced"
  
  // Initial context data
  initial_context: {
    projectName: "MyApp",
    language: "TypeScript"
  },
  
  // Debugging
  debug: false,                  // Enable debug logging
  trace: false,                  // Enable execution trace
  
  // Persistence
  persist: false,                // Save state after each step
  persist_dir: "./.openagents/state"
}
```

### Workflow Definition Schema

```typescript
interface WorkflowDefinition {
  // Identity
  id: string                     // Unique identifier
  description: string            // Human-readable description
  
  // Steps
  steps: WorkflowStep[]          // Array of workflow steps
  
  // Safety limits
  max_iterations?: number        // Default: 100
  max_duration_ms?: number       // Default: 300000 (5 min)
  
  // Context management
  initial_context?: Record<string, any>
  max_context_size?: number      // Default: 100
  context_retention?: "all" | "recent" | "referenced"
  
  // Execution
  parallel?: boolean             // Enable parallel execution
  
  // Debugging
  debug?: boolean                // Enable debug logging
  trace?: boolean                // Enable execution trace
  
  // Persistence
  persist?: boolean              // Save state after each step
  persist_dir?: string           // Where to save state
}
```

## Step Types

### 1. Agent Step

Executes an OpenAgents agent.

```typescript
{
  id: "plan",
  type: "agent",
  agent: "planner",              // Agent name (from .openagents/agents/)
  
  // Routing
  next: "code",                  // Next step on success
  on_error: "error-handler",     // Step to run on error
  
  // Input
  input: "requirements",         // Reference to previous step
  
  // Retry configuration
  max_retries: 3,                // Retry up to 3 times
  retry_delay_ms: 1000,          // Wait 1s between retries
  
  // Timeout
  timeout_ms: 60000              // 1 minute timeout
}
```

**Agent Input Format:**

The agent receives:
```typescript
{
  input: "Original workflow input",
  context: {
    step1: { /* result data */ },
    step2: { /* result data */ }
  },
  [referencedStep]: { /* explicit reference if input field set */ }
}
```

### 2. Transform Step

Transforms data using JavaScript expressions.

```typescript
{
  id: "extract-files",
  type: "transform",
  transform: "plan.files.map(f => f.name)",
  next: "code"
}
```

**Available Variables:**
- `input` - Original workflow input
- `step1`, `step2`, etc. - Results from previous steps

**Examples:**
```typescript
// Extract field
{ transform: "plan.files" }

// Map array
{ transform: "plan.files.map(f => f.name)" }

// Filter array
{ transform: "tests.filter(t => t.passed)" }

// Compute value
{ transform: "code.linesOfCode + test.linesOfCode" }

// Complex expression
{ transform: "{ total: plan.files.length, completed: code.filesCreated.length }" }
```

### 3. Condition Step

Makes routing decisions based on conditions.

```typescript
{
  id: "check-tests",
  type: "condition",
  condition: "test.passed === true",
  then: "deploy",                // If true
  else: "fix-tests"              // If false
}
```

**Available Variables:**
- `input` - Original workflow input
- `step1`, `step2`, etc. - Results from previous steps

**Examples:**
```typescript
// Simple comparison
{ condition: "test.coverage > 80" }

// Boolean check
{ condition: "build.success === true" }

// Complex logic
{ condition: "test.passed && build.success && deploy.ready" }

// Array check
{ condition: "errors.length === 0" }

// Nested property
{ condition: "plan.files.length > 0" }
```

### 4. Approval Step (Future)

Requests human approval before continuing.

```typescript
{
  id: "approve-deploy",
  type: "approval",
  message: "Deploy to production?",
  on_approve: "deploy",
  on_reject: "cancel",
  timeout_ms: 300000             // 5 minute timeout
}
```

### 5. Parallel Step (Future)

Executes multiple steps concurrently.

```typescript
{
  id: "parallel-tests",
  type: "parallel",
  steps: [
    { id: "unit-tests", type: "agent", agent: "unit-tester" },
    { id: "integration-tests", type: "agent", agent: "integration-tester" },
    { id: "e2e-tests", type: "agent", agent: "e2e-tester" }
  ],
  min_success: 2,                // At least 2 must succeed
  next: "report"
}
```

## Context & Data Flow

### Context Structure

The workflow context is an immutable object that tracks execution state:

```typescript
interface WorkflowContext {
  workflowId: string             // Workflow identifier
  startTime: Date                // When workflow started
  input: any                     // Original input
  results: Map<string, StepResult>  // All step results
  metadata: {
    currentStep: string          // Current step ID
    previousSteps: string[]      // Execution history
    iterationCount: number       // Total iterations
    errorCount: number           // Total errors
  }
}
```

### Step Result Structure

Each step produces a result:

```typescript
interface StepResult {
  stepId: string                 // Step identifier
  success: boolean               // Success flag
  data: any                      // Result data
  error?: Error                  // Error if failed
  startTime: Date                // When step started
  endTime: Date                  // When step ended
  duration: number               // Duration in ms
  retries?: number               // Number of retries
}
```

### Accessing Previous Results

**In Agent Steps:**

Agents automatically receive all previous results in their input:

```typescript
{
  input: { task: "Build feature" },
  context: {
    plan: { files: ["a.ts", "b.ts"] },
    code: { filesCreated: ["a.ts", "b.ts"] }
  }
}
```

**Explicit References:**

Use the `input` field to reference a specific step:

```typescript
{
  id: "code",
  type: "agent",
  agent: "coder",
  input: "plan",                 // Explicitly reference plan step
  next: "test"
}
```

This adds the referenced step at the top level:

```typescript
{
  input: { task: "Build feature" },
  context: { plan: {...}, code: {...} },
  plan: { files: ["a.ts", "b.ts"] }  // ← Explicit reference
}
```

**In Transform Steps:**

Access results directly by step ID:

```typescript
{
  id: "count-files",
  type: "transform",
  transform: "plan.files.length"
}
```

**In Condition Steps:**

Use step IDs in conditions:

```typescript
{
  id: "check-coverage",
  type: "condition",
  condition: "test.coverage > 80",
  then: "deploy",
  else: "improve-tests"
}
```

### Context Pruning

To prevent unbounded growth, context can be pruned:

```typescript
{
  max_context_size: 50,          // Keep last 50 results
  context_retention: "recent"    // Only keep recent results
}
```

**Retention Strategies:**
- `"all"` - Keep all results (default)
- `"recent"` - Keep only recent results (up to max_context_size)
- `"referenced"` - Keep only results referenced by other steps

## Error Handling

### Retry Logic

Steps can retry on failure:

```typescript
{
  id: "flaky-test",
  type: "agent",
  agent: "tester",
  max_retries: 3,                // Retry up to 3 times
  retry_delay_ms: 1000,          // Wait 1s between retries
  next: "report"
}
```

**Retry Behavior:**
- Exponential backoff (1s, 2s, 4s, 8s, ...)
- Max delay capped at 30s
- Retry count included in result

### Error Handlers

Route to error handler on failure:

```typescript
{
  id: "risky-step",
  type: "agent",
  agent: "risky-agent",
  next: "success-path",
  on_error: "error-handler"      // Route here on error
}
```

**Error Handler Example:**

```typescript
{
  id: "error-handler",
  type: "agent",
  agent: "error-recovery",
  next: "retry-original"         // Can retry or continue
}
```

### Workflow-Level Error Handling

```typescript
const result = await executor.execute(workflow, input)

if (!result.success) {
  console.error("Workflow failed:", result.error)
  console.log("Failed at step:", result.context.metadata.currentStep)
  console.log("Error count:", result.context.metadata.errorCount)
}
```

## Advanced Features

### Conditional Routing

Route based on step results:

```typescript
{
  id: "check-build",
  type: "condition",
  condition: "build.success === true",
  then: "deploy",
  else: "notify-failure"
}
```

### Dynamic Input Building

Reference specific step outputs:

```typescript
{
  id: "deploy",
  type: "agent",
  agent: "deployer",
  input: "build",                // Only pass build output
  next: "notify"
}
```

### Timeout Configuration

Set timeouts at workflow and step level:

```typescript
// Workflow-level timeout
{
  max_duration_ms: 600000        // 10 minutes for entire workflow
}

// Step-level timeout
{
  id: "slow-step",
  type: "agent",
  agent: "slow-agent",
  timeout_ms: 120000             // 2 minutes for this step
}
```

### Safety Guards

Built-in guards prevent common issues:

```typescript
// Max iterations (prevents infinite loops)
{
  max_iterations: 100
}

// Max errors (stops after too many failures)
const executor = new WorkflowExecutor({
  guards: [new MaxErrorGuard(10)]
})

// Circular dependency detection
const executor = new WorkflowExecutor({
  guards: [new CircularDependencyGuard()]
})
```

### Debugging & Tracing

Enable detailed logging:

```typescript
{
  debug: true,                   // Enable debug logging
  trace: true                    // Enable execution trace
}

const result = await executor.execute(workflow, input)

// Access trace
if (result.trace) {
  for (const entry of result.trace) {
    console.log(`${entry.stepId}: ${entry.result.duration}ms`)
  }
}
```

## Limitations

### Current Limitations

1. **Sequential Execution Only**
   - Parallel steps not yet implemented
   - All steps run one at a time
   - Future: `type: "parallel"` support

2. **No Approval Steps**
   - Human-in-the-loop not yet implemented
   - Future: `type: "approval"` support

3. **No Persistence**
   - Workflow state not saved between runs
   - Future: `persist: true` support

4. **No Workflow Composition**
   - Cannot call workflows from workflows
   - Future: `type: "workflow"` support

5. **Limited Transform Expressions**
   - Only JavaScript expressions supported
   - No async operations in transforms
   - No external function calls

6. **No Dynamic Step Creation**
   - Steps must be defined upfront
   - Cannot add steps during execution
   - Future: Dynamic workflow modification

7. **No Loop Constructs**
   - No `while` or `for` loops
   - Must use step routing for iteration
   - Can create loops via `next` field (with guards)

### Safety Limitations

1. **Max Iterations: 100** (default)
   - Prevents infinite loops
   - Configurable via `max_iterations`

2. **Max Duration: 5 minutes** (default)
   - Prevents hanging workflows
   - Configurable via `max_duration_ms`

3. **Max Context Size: 100 results** (default)
   - Prevents memory issues
   - Configurable via `max_context_size`

4. **Step Timeout: 1 minute** (default)
   - Prevents hanging steps
   - Configurable via `timeout_ms`

### Expression Limitations

**Transform & Condition Steps:**

✅ **Allowed:**
```typescript
// Property access
"plan.files"

// Array methods
"plan.files.map(f => f.name)"
"tests.filter(t => t.passed)"

// Arithmetic
"code.linesOfCode + test.linesOfCode"

// Comparisons
"test.coverage > 80"

// Boolean logic
"test.passed && build.success"

// Object literals
"{ total: plan.files.length }"
```

❌ **Not Allowed:**
```typescript
// Async operations
"await fetchData()"

// External functions
"myCustomFunction(plan)"

// Side effects
"console.log(plan)"

// Loops
"for (let i = 0; i < 10; i++) {}"

// Assignments
"let x = 5"
```

## Best Practices

### 1. Workflow Design

**Keep Workflows Focused:**
```typescript
// ✅ Good: Single responsibility
{
  id: "build-feature",
  description: "Plan → Code → Test",
  steps: [...]
}

// ❌ Bad: Too many responsibilities
{
  id: "everything",
  description: "Plan → Code → Test → Deploy → Monitor → Report → ...",
  steps: [...] // 20+ steps
}
```

**Use Descriptive IDs:**
```typescript
// ✅ Good
{ id: "plan-architecture", type: "agent", agent: "planner" }
{ id: "implement-auth", type: "agent", agent: "coder" }
{ id: "test-auth-flow", type: "agent", agent: "tester" }

// ❌ Bad
{ id: "step1", type: "agent", agent: "planner" }
{ id: "step2", type: "agent", agent: "coder" }
{ id: "step3", type: "agent", agent: "tester" }
```

### 2. Error Handling

**Always Add Error Handlers:**
```typescript
// ✅ Good
{
  id: "deploy",
  type: "agent",
  agent: "deployer",
  next: "success",
  on_error: "rollback"           // Handle errors
}

// ❌ Bad
{
  id: "deploy",
  type: "agent",
  agent: "deployer",
  next: "success"                // No error handling
}
```

**Use Retries for Flaky Operations:**
```typescript
{
  id: "api-call",
  type: "agent",
  agent: "api-caller",
  max_retries: 3,                // Retry flaky operations
  retry_delay_ms: 1000,
  next: "process-response"
}
```

### 3. Context Management

**Reference Specific Steps:**
```typescript
// ✅ Good: Explicit reference
{
  id: "deploy",
  type: "agent",
  agent: "deployer",
  input: "build",                // Only needs build output
  next: "notify"
}

// ❌ Bad: Agent gets all context (may be large)
{
  id: "deploy",
  type: "agent",
  agent: "deployer",
  next: "notify"
}
```

**Prune Large Contexts:**
```typescript
{
  max_context_size: 50,          // Keep last 50 results
  context_retention: "recent"
}
```

### 4. Timeouts

**Set Appropriate Timeouts:**
```typescript
// Fast operations
{
  id: "validate",
  type: "agent",
  agent: "validator",
  timeout_ms: 30000              // 30 seconds
}

// Slow operations
{
  id: "build",
  type: "agent",
  agent: "builder",
  timeout_ms: 300000             // 5 minutes
}
```

### 5. Testing

**Test Workflows Incrementally:**
```typescript
// Start with minimal workflow
const minimalWorkflow = {
  id: "test",
  description: "Test single step",
  steps: [
    { id: "plan", type: "agent", agent: "planner" }
  ]
}

// Add steps one at a time
const expandedWorkflow = {
  id: "test",
  description: "Test two steps",
  steps: [
    { id: "plan", type: "agent", agent: "planner", next: "code" },
    { id: "code", type: "agent", agent: "coder" }
  ]
}
```

**Use Debug Mode:**
```typescript
const workflow = {
  id: "debug-workflow",
  description: "Debugging workflow",
  debug: true,                   // Enable debug logging
  trace: true,                   // Enable execution trace
  steps: [...]
}
```

## Examples

### Example 1: Simple Sequential Workflow

```typescript
const workflow: WorkflowDefinition = {
  id: "feature-workflow",
  description: "Build a feature: Plan → Code → Test",
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code"
    },
    {
      id: "code",
      type: "agent",
      agent: "coder",
      input: "plan",
      next: "test"
    },
    {
      id: "test",
      type: "agent",
      agent: "tester"
    }
  ]
}

const result = await executor.execute(workflow, {
  task: "Build authentication system"
})
```

### Example 2: Workflow with Error Handling

```typescript
const workflow: WorkflowDefinition = {
  id: "resilient-workflow",
  description: "Workflow with error handling",
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code",
      on_error: "error-handler"
    },
    {
      id: "code",
      type: "agent",
      agent: "coder",
      input: "plan",
      max_retries: 3,
      retry_delay_ms: 1000,
      next: "test",
      on_error: "error-handler"
    },
    {
      id: "test",
      type: "agent",
      agent: "tester",
      max_retries: 2,
      on_error: "error-handler"
    },
    {
      id: "error-handler",
      type: "agent",
      agent: "error-recovery"
    }
  ]
}
```

### Example 3: Workflow with Conditional Routing

```typescript
const workflow: WorkflowDefinition = {
  id: "conditional-workflow",
  description: "Deploy if tests pass",
  steps: [
    {
      id: "build",
      type: "agent",
      agent: "builder",
      next: "test"
    },
    {
      id: "test",
      type: "agent",
      agent: "tester",
      next: "check-tests"
    },
    {
      id: "check-tests",
      type: "condition",
      condition: "test.passed === true && test.coverage > 80",
      then: "deploy",
      else: "notify-failure"
    },
    {
      id: "deploy",
      type: "agent",
      agent: "deployer",
      input: "build"
    },
    {
      id: "notify-failure",
      type: "agent",
      agent: "notifier"
    }
  ]
}
```

### Example 4: Workflow with Data Transformation

```typescript
const workflow: WorkflowDefinition = {
  id: "transform-workflow",
  description: "Transform data between steps",
  steps: [
    {
      id: "analyze",
      type: "agent",
      agent: "analyzer"
    },
    {
      id: "extract-files",
      type: "transform",
      transform: "analyze.files.map(f => f.path)",
      next: "process"
    },
    {
      id: "process",
      type: "agent",
      agent: "processor"
    },
    {
      id: "count-results",
      type: "transform",
      transform: "{ total: process.results.length, success: process.results.filter(r => r.success).length }",
      next: "report"
    },
    {
      id: "report",
      type: "agent",
      agent: "reporter"
    }
  ]
}
```

### Example 5: Complex Workflow

```typescript
const workflow: WorkflowDefinition = {
  id: "complex-workflow",
  description: "Full feature development workflow",
  max_iterations: 50,
  max_duration_ms: 600000,       // 10 minutes
  max_context_size: 50,
  debug: true,
  
  steps: [
    // Planning phase
    {
      id: "analyze-requirements",
      type: "agent",
      agent: "requirements-analyzer",
      timeout_ms: 60000,
      next: "plan-architecture"
    },
    {
      id: "plan-architecture",
      type: "agent",
      agent: "architect",
      input: "analyze-requirements",
      timeout_ms: 120000,
      next: "estimate-effort"
    },
    {
      id: "estimate-effort",
      type: "transform",
      transform: "{ files: plan_architecture.files.length, complexity: plan_architecture.complexity }",
      next: "check-feasibility"
    },
    {
      id: "check-feasibility",
      type: "condition",
      condition: "estimate_effort.complexity < 8",
      then: "implement",
      else: "simplify-plan"
    },
    
    // Implementation phase
    {
      id: "implement",
      type: "agent",
      agent: "coder",
      input: "plan-architecture",
      max_retries: 2,
      timeout_ms: 300000,
      next: "review-code",
      on_error: "error-recovery"
    },
    {
      id: "review-code",
      type: "agent",
      agent: "code-reviewer",
      input: "implement",
      next: "check-review"
    },
    {
      id: "check-review",
      type: "condition",
      condition: "review_code.approved === true",
      then: "test",
      else: "fix-issues"
    },
    
    // Testing phase
    {
      id: "test",
      type: "agent",
      agent: "tester",
      max_retries: 3,
      timeout_ms: 180000,
      next: "check-tests"
    },
    {
      id: "check-tests",
      type: "condition",
      condition: "test.passed === true && test.coverage > 80",
      then: "success",
      else: "fix-tests"
    },
    
    // Error handling
    {
      id: "simplify-plan",
      type: "agent",
      agent: "simplifier",
      next: "plan-architecture"
    },
    {
      id: "fix-issues",
      type: "agent",
      agent: "fixer",
      input: "review-code",
      next: "implement"
    },
    {
      id: "fix-tests",
      type: "agent",
      agent: "test-fixer",
      input: "test",
      next: "test"
    },
    {
      id: "error-recovery",
      type: "agent",
      agent: "error-handler"
    },
    
    // Success
    {
      id: "success",
      type: "agent",
      agent: "reporter"
    }
  ]
}
```

## Summary

- ✅ Workflows are declarative JSON/TypeScript definitions
- ✅ Steps execute sequentially with context passing
- ✅ Multiple step types: agent, transform, condition
- ✅ Error handling via retries and error handlers
- ✅ Safety guards prevent infinite loops and timeouts
- ✅ Context management prevents memory issues
- ✅ Debugging and tracing for troubleshooting

For agent integration details, see [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md)

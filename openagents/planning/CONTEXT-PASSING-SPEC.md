# Context Passing Between Steps - Detailed Specification

**Date**: Dec 18, 2025  
**Focus**: How agents share data and update context between workflow steps

---

## Problem Statement

In a workflow like this:

```json
{
  "steps": [
    { "id": "plan", "type": "agent", "agent": "planner" },
    { "id": "code", "type": "agent", "agent": "coder" },
    { "id": "test", "type": "agent", "agent": "tester" }
  ]
}
```

**Questions:**
1. How does the `coder` agent access the plan from the `planner` agent?
2. How does the `tester` agent know what code was written?
3. How do we keep context immutable while allowing updates?
4. How do we handle parallel steps that need to share context?

---

## Solution: Immutable Context with Explicit References

### Core Principle
**Context is immutable, but each step adds its result to a shared context map.**

```typescript
interface WorkflowContext {
  readonly workflowId: string
  readonly input: any                              // Original workflow input
  readonly results: ReadonlyMap<string, StepResult>  // All step results
  
  // Methods return NEW context
  addResult(stepId: string, result: StepResult): WorkflowContext
  getResult(stepId: string): StepResult | undefined
}
```

---

## Method 1: Automatic Context Injection (Default)

### How It Works

**The workflow executor automatically injects previous step results into the agent's input.**

```typescript
class AgentStepExecutor {
  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    // Prepare input with full context
    const input = this.prepareInput(step, context)
    
    // Execute agent with enriched input
    const agent = this.getAgent(step.agent!)
    const result = await agent.execute(input)
    
    return { stepId: step.id, success: true, data: result }
  }
  
  private prepareInput(step: WorkflowStep, context: WorkflowContext): any {
    return {
      // Original workflow input
      input: context.input,
      
      // All previous step results
      context: this.buildContextObject(context),
      
      // Specific step reference (if specified)
      ...(step.input ? { [step.input]: context.getResult(step.input)?.data } : {})
    }
  }
  
  private buildContextObject(context: WorkflowContext): Record<string, any> {
    const contextObj: Record<string, any> = {}
    
    for (const [stepId, result] of context.results) {
      contextObj[stepId] = result.data
    }
    
    return contextObj
  }
}
```

### Example: Automatic Context

**Workflow:**
```json
{
  "id": "feature-dev",
  "steps": [
    { "id": "plan", "type": "agent", "agent": "planner", "next": "code" },
    { "id": "code", "type": "agent", "agent": "coder", "next": "test" },
    { "id": "test", "type": "agent", "agent": "tester" }
  ]
}
```

**What each agent receives:**

#### Step 1: Planner
```typescript
{
  input: "Build a dark mode toggle",  // Original workflow input
  context: {}                          // No previous steps
}
```

#### Step 2: Coder
```typescript
{
  input: "Build a dark mode toggle",  // Original workflow input
  context: {
    plan: {                            // Result from planner
      files: ["src/theme.ts", "src/toggle.tsx"],
      approach: "Use CSS variables and React context",
      steps: [...]
    }
  }
}
```

#### Step 3: Tester
```typescript
{
  input: "Build a dark mode toggle",  // Original workflow input
  context: {
    plan: {                            // Result from planner
      files: ["src/theme.ts", "src/toggle.tsx"],
      approach: "Use CSS variables and React context"
    },
    code: {                            // Result from coder
      filesCreated: ["src/theme.ts", "src/toggle.tsx"],
      changes: [...]
    }
  }
}
```

### Agent Prompt Example

**Coder Agent Prompt:**
```markdown
You are a coding specialist.

## Context Available

You have access to previous workflow steps via the `context` object:
- `context.plan` - The implementation plan (if available)
- `context.research` - Research findings (if available)

## Your Task

Implement the feature based on:
1. The original request: {{input}}
2. The plan (if available): {{context.plan}}

## Output Format

Return a JSON object with:
{
  "filesCreated": ["file1.ts", "file2.ts"],
  "filesModified": ["file3.ts"],
  "changes": "Description of changes"
}
```

---

## Method 2: Explicit Input References

### How It Works

**Steps can explicitly reference previous step outputs.**

```json
{
  "steps": [
    { "id": "plan", "type": "agent", "agent": "planner", "next": "code" },
    { 
      "id": "code", 
      "type": "agent", 
      "agent": "coder",
      "input": "plan",  // ← Explicit reference
      "next": "test" 
    },
    { 
      "id": "test", 
      "type": "agent", 
      "agent": "tester",
      "input": "code",  // ← Explicit reference
    }
  ]
}
```

### Implementation

```typescript
class AgentStepExecutor {
  private prepareInput(step: WorkflowStep, context: WorkflowContext): any {
    // If explicit input reference specified
    if (step.input) {
      const referencedResult = context.getResult(step.input)
      
      if (!referencedResult) {
        throw new Error(`Referenced step not found: ${step.input}`)
      }
      
      return {
        input: context.input,           // Original input
        [step.input]: referencedResult.data,  // Referenced step data
        context: this.buildContextObject(context)  // Full context
      }
    }
    
    // Otherwise, use automatic context injection
    return {
      input: context.input,
      context: this.buildContextObject(context)
    }
  }
}
```

### Example: Explicit References

**What coder receives:**
```typescript
{
  input: "Build a dark mode toggle",  // Original
  plan: {                              // Explicitly referenced
    files: ["src/theme.ts"],
    approach: "Use CSS variables"
  },
  context: {                           // Full context (for reference)
    plan: { ... }
  }
}
```

---

## Method 3: Transform Steps (Data Manipulation)

### How It Works

**Add a `transform` step type to manipulate context data.**

```json
{
  "steps": [
    { "id": "plan", "type": "agent", "agent": "planner", "next": "extract" },
    { 
      "id": "extract", 
      "type": "transform",
      "transform": "context.plan.files",  // Extract just the files
      "output": "files",                   // Store as "files"
      "next": "code"
    },
    { 
      "id": "code", 
      "type": "agent", 
      "agent": "coder",
      "input": "files",  // Use transformed data
    }
  ]
}
```

### Implementation

```typescript
class TransformStepExecutor implements StepExecutor {
  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = new Date()
    
    try {
      // Evaluate transform expression
      const data = this.evaluateTransform(step.transform!, context)
      
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
  
  route(step: WorkflowStep, result: StepResult): string | null {
    return result.success ? step.next || null : step.on_error || null
  }
  
  private evaluateTransform(transform: string, context: WorkflowContext): any {
    // Safe path evaluation (no eval!)
    // Support: context.stepId.field.subfield
    
    const parts = transform.replace(/^context\./, "").split(".")
    const stepId = parts[0]
    const path = parts.slice(1)
    
    const stepResult = context.getResult(stepId)
    if (!stepResult) {
      throw new Error(`Step not found: ${stepId}`)
    }
    
    // Navigate path
    let value = stepResult.data
    for (const key of path) {
      if (value && typeof value === "object" && key in value) {
        value = value[key]
      } else {
        throw new Error(`Path not found: ${transform}`)
      }
    }
    
    return value
  }
}
```

---

## Method 4: Parallel Steps with Shared Context

### Problem

**Parallel steps execute concurrently. How do they share context?**

```json
{
  "id": "parallel-tests",
  "type": "parallel",
  "steps": [
    { "id": "unit", "type": "agent", "agent": "test-unit" },
    { "id": "integration", "type": "agent", "agent": "test-integration" },
    { "id": "e2e", "type": "agent", "agent": "test-e2e" }
  ]
}
```

### Solution: Read-Only Context Sharing

```typescript
class ParallelStepExecutor implements StepExecutor {
  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = new Date()
    
    try {
      // All parallel steps get READ-ONLY access to same context
      const results = await Promise.allSettled(
        step.steps!.map(async (nestedStep) => {
          const executor = this.getExecutor(nestedStep.type)
          
          // Each step gets SAME context (read-only)
          return await executor.execute(nestedStep, context)
        })
      )
      
      // Collect results
      const data = results.map((r, i) => ({
        stepId: step.steps![i].id,
        status: r.status,
        result: r.status === "fulfilled" ? r.value : null,
        error: r.status === "rejected" ? r.reason : null
      }))
      
      return {
        stepId: step.id,
        success: results.every(r => r.status === "fulfilled"),
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
}
```

**Key Points:**
1. All parallel steps receive **same context** (read-only)
2. Parallel steps **cannot see each other's results** (they run concurrently)
3. Results are collected **after all complete**
4. Next step sees **all parallel results**

### Example: Parallel Context

**Before parallel step:**
```typescript
context = {
  input: "Test the application",
  results: {
    code: { filesCreated: [...] }
  }
}
```

**Each parallel step receives:**
```typescript
{
  input: "Test the application",
  context: {
    code: { filesCreated: [...] }  // Same for all
  }
}
```

**After parallel step:**
```typescript
context = {
  input: "Test the application",
  results: {
    code: { filesCreated: [...] },
    "parallel-tests": {
      data: [
        { stepId: "unit", result: { passed: 50, failed: 0 } },
        { stepId: "integration", result: { passed: 20, failed: 1 } },
        { stepId: "e2e", result: { passed: 10, failed: 0 } }
      ]
    }
  }
}
```

---

## Method 5: Context Accumulation Pattern

### Use Case

**Build up context progressively through workflow.**

```json
{
  "id": "research-and-implement",
  "steps": [
    { "id": "research-1", "type": "agent", "agent": "researcher", "next": "research-2" },
    { "id": "research-2", "type": "agent", "agent": "researcher", "next": "synthesize" },
    { "id": "synthesize", "type": "agent", "agent": "synthesizer", "next": "code" },
    { "id": "code", "type": "agent", "agent": "coder" }
  ]
}
```

**Synthesizer receives:**
```typescript
{
  input: "Research dark mode implementations",
  context: {
    "research-1": { findings: [...], sources: [...] },
    "research-2": { findings: [...], sources: [...] }
  }
}
```

**Synthesizer prompt:**
```markdown
You are a research synthesizer.

## Available Research

{{#each context}}
### {{@key}}
{{this.findings}}
{{/each}}

## Your Task

Synthesize all research into a coherent implementation plan.
```

---

## Complete Example: Feature Development Workflow

### Workflow Definition

```json
{
  "id": "feature-development",
  "description": "Complete feature development with context passing",
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "next": "approve-plan"
    },
    {
      "id": "approve-plan",
      "type": "approval",
      "message": "Approve implementation plan?",
      "on_approve": "code",
      "on_reject": "plan"
    },
    {
      "id": "code",
      "type": "agent",
      "agent": "coder",
      "input": "plan",
      "next": "parallel-tests"
    },
    {
      "id": "parallel-tests",
      "type": "parallel",
      "steps": [
        { "id": "unit", "type": "agent", "agent": "test-unit" },
        { "id": "integration", "type": "agent", "agent": "test-integration" }
      ],
      "next": "check-tests"
    },
    {
      "id": "check-tests",
      "type": "condition",
      "condition": "context.parallel-tests.success === true",
      "then": "review",
      "else": "code"
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

### Context Flow

#### Step 1: Plan
**Input:**
```typescript
{
  input: "Add dark mode toggle"
}
```

**Output:**
```typescript
{
  files: ["src/theme.ts", "src/toggle.tsx"],
  approach: "Use CSS variables",
  steps: ["Create theme context", "Build toggle component", "Add tests"]
}
```

**Context after:**
```typescript
{
  results: {
    plan: { files: [...], approach: "...", steps: [...] }
  }
}
```

---

#### Step 2: Approve Plan
**Input:**
```typescript
{
  input: "Add dark mode toggle",
  context: {
    plan: { files: [...], approach: "...", steps: [...] }
  }
}
```

**Output:**
```typescript
{ approved: true }
```

---

#### Step 3: Code
**Input (with explicit reference):**
```typescript
{
  input: "Add dark mode toggle",
  plan: {  // ← Explicitly referenced
    files: ["src/theme.ts", "src/toggle.tsx"],
    approach: "Use CSS variables",
    steps: [...]
  },
  context: {
    plan: { ... },
    "approve-plan": { approved: true }
  }
}
```

**Output:**
```typescript
{
  filesCreated: ["src/theme.ts", "src/toggle.tsx"],
  filesModified: ["src/App.tsx"],
  changes: "Added theme context and toggle component"
}
```

---

#### Step 4: Parallel Tests
**Input (same for all parallel steps):**
```typescript
{
  input: "Add dark mode toggle",
  context: {
    plan: { ... },
    "approve-plan": { ... },
    code: { filesCreated: [...], filesModified: [...] }
  }
}
```

**Output (collected):**
```typescript
{
  data: [
    { 
      stepId: "unit", 
      result: { passed: 15, failed: 0, coverage: 95 } 
    },
    { 
      stepId: "integration", 
      result: { passed: 5, failed: 0 } 
    }
  ],
  success: true
}
```

---

#### Step 5: Check Tests (Condition)
**Input:**
```typescript
{
  input: "Add dark mode toggle",
  context: {
    plan: { ... },
    code: { ... },
    "parallel-tests": {
      data: [
        { stepId: "unit", result: { passed: 15, failed: 0 } },
        { stepId: "integration", result: { passed: 5, failed: 0 } }
      ],
      success: true
    }
  }
}
```

**Evaluation:**
```typescript
context["parallel-tests"].success === true  // ✅ true
```

**Routes to:** `review`

---

#### Step 6: Review
**Input (with explicit reference):**
```typescript
{
  input: "Add dark mode toggle",
  code: {  // ← Explicitly referenced
    filesCreated: ["src/theme.ts", "src/toggle.tsx"],
    filesModified: ["src/App.tsx"],
    changes: "Added theme context and toggle component"
  },
  context: {
    plan: { ... },
    code: { ... },
    "parallel-tests": { ... }
  }
}
```

**Output:**
```typescript
{
  approved: true,
  comments: ["Good implementation", "Tests pass", "Code is clean"],
  suggestions: []
}
```

---

## Agent Prompt Templates

### Planner Agent
```markdown
You are a planning specialist.

## Task
{{input}}

## Your Job
Create a detailed implementation plan.

## Output Format
Return JSON:
{
  "files": ["file1.ts", "file2.ts"],
  "approach": "High-level approach",
  "steps": ["Step 1", "Step 2", "Step 3"]
}
```

### Coder Agent
```markdown
You are a coding specialist.

## Task
{{input}}

## Plan (if available)
{{#if context.plan}}
Files to create: {{context.plan.files}}
Approach: {{context.plan.approach}}
Steps: {{context.plan.steps}}
{{/if}}

## Your Job
Implement the feature based on the plan.

## Output Format
Return JSON:
{
  "filesCreated": ["file1.ts"],
  "filesModified": ["file2.ts"],
  "changes": "Description of changes"
}
```

### Tester Agent
```markdown
You are a testing specialist.

## Task
Test the implementation.

## Code Changes
{{#if context.code}}
Files created: {{context.code.filesCreated}}
Files modified: {{context.code.filesModified}}
Changes: {{context.code.changes}}
{{/if}}

## Your Job
Run tests and report results.

## Output Format
Return JSON:
{
  "passed": 15,
  "failed": 0,
  "coverage": 95,
  "details": "All tests passed"
}
```

### Reviewer Agent
```markdown
You are a code reviewer.

## Task
Review the implementation.

## Code Changes
{{#if code}}
Files created: {{code.filesCreated}}
Files modified: {{code.filesModified}}
Changes: {{code.changes}}
{{/if}}

## Test Results
{{#if context.parallel-tests}}
{{#each context.parallel-tests.data}}
- {{this.stepId}}: {{this.result.passed}} passed, {{this.result.failed}} failed
{{/each}}
{{/if}}

## Your Job
Review the code and provide feedback.

## Output Format
Return JSON:
{
  "approved": true,
  "comments": ["Comment 1", "Comment 2"],
  "suggestions": []
}
```

---

## Implementation: Context Builder

```typescript
class ContextBuilder {
  /**
   * Build input for agent with full context
   */
  static buildAgentInput(
    step: WorkflowStep,
    context: WorkflowContext
  ): any {
    const input: any = {
      // Original workflow input
      input: context.input,
      
      // Full context object
      context: this.buildContextObject(context)
    }
    
    // Add explicit reference if specified
    if (step.input) {
      const referencedResult = context.getResult(step.input)
      if (referencedResult) {
        input[step.input] = referencedResult.data
      }
    }
    
    return input
  }
  
  /**
   * Build context object from all step results
   */
  private static buildContextObject(
    context: WorkflowContext
  ): Record<string, any> {
    const contextObj: Record<string, any> = {}
    
    for (const [stepId, result] of context.results) {
      if (result.success) {
        contextObj[stepId] = result.data
      }
    }
    
    return contextObj
  }
  
  /**
   * Get specific value from context by path
   */
  static getContextValue(
    context: WorkflowContext,
    path: string
  ): any {
    // Parse path: context.stepId.field.subfield
    const parts = path.replace(/^context\./, "").split(".")
    const stepId = parts[0]
    const fieldPath = parts.slice(1)
    
    const stepResult = context.getResult(stepId)
    if (!stepResult) {
      return undefined
    }
    
    // Navigate field path
    let value = stepResult.data
    for (const key of fieldPath) {
      if (value && typeof value === "object" && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }
    
    return value
  }
}
```

---

## Summary

### Context Passing Methods

| Method | Use Case | Example |
|--------|----------|---------|
| **Automatic Injection** | Default - all steps get full context | `context.plan`, `context.code` |
| **Explicit References** | Step needs specific previous step | `"input": "plan"` |
| **Transform Steps** | Extract/manipulate data | `"transform": "context.plan.files"` |
| **Parallel Sharing** | Concurrent steps need same context | Read-only context for all |
| **Accumulation** | Build up context progressively | Multiple research steps |

### Key Principles

1. **Immutable Context** - Never mutate, always create new
2. **Automatic by Default** - All steps get full context
3. **Explicit When Needed** - Reference specific steps
4. **Read-Only for Parallel** - No race conditions
5. **Type-Safe** - Full TypeScript support

### Benefits

✅ **Simple** - Automatic context injection by default  
✅ **Flexible** - Explicit references when needed  
✅ **Safe** - Immutable, no race conditions  
✅ **Powerful** - Full context available to all steps  
✅ **Testable** - Pure functions, easy to mock

---

**Ready to implement?** 🚀

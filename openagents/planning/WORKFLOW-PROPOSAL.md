# OpenAgents Workflow System - Proposal

**Date**: Dec 18, 2025  
**Status**: Proposal for Review  
**Goal**: Add workflow orchestration to OpenAgents

---

## Executive Summary

Add a **lightweight, configuration-based workflow system** to OpenAgents that enables users to:
- Define multi-agent workflows declaratively (JSON/YAML)
- Orchestrate sequential, parallel, and conditional execution
- Include approval gates for human-in-the-loop
- Reuse and share workflow patterns
- Integrate seamlessly with existing OpenAgents features

**Inspired by:** PocketFlow's graph-based execution model  
**Adapted for:** OpenAgents' configuration-first, type-safe, approval-aware architecture

---

## Problem Statement

### Current Pain Points

1. **Manual Orchestration**
   ```
   User: "Plan this feature"
   → Agent: Plans
   User: "Now code it"
   → Agent: Codes
   User: "Now test it"
   → Agent: Tests
   ```
   **Problem:** User must manually coordinate each step

2. **No Reusable Patterns**
   - Can't save "plan → approve → code → test → review" as a workflow
   - Can't share workflows between projects
   - Can't version control workflows

3. **Complex Coordination**
   - Multi-agent workflows require custom code
   - No built-in retry logic
   - No parallel execution support
   - No conditional branching

4. **Scaling Issues**
   - Adding more agents increases coordination complexity
   - Hard to maintain consistency across projects
   - Difficult to onboard new team members

---

## Proposed Solution

### Core Concept: Configuration-Based Workflows

```json
{
  "workflows": {
    "feature-development": {
      "description": "Complete feature development workflow",
      "steps": [
        { "id": "plan", "agent": "planner", "on_success": "approve" },
        { "id": "approve", "type": "approval", "on_approve": "code", "on_reject": "plan" },
        { "id": "code", "agent": "coder", "on_success": "test" },
        { "id": "test", "agent": "tester", "on_success": "review", "on_error": "code" },
        { "id": "review", "agent": "reviewer", "on_success": "end", "on_error": "code" }
      ]
    }
  }
}
```

**Usage:**
```bash
opencode workflow run feature-development --input "Add dark mode toggle"
```

---

## Design Principles

### 1. **Configuration-First** 📝
- Workflows defined in JSON/YAML (not code)
- Easy to read, write, and share
- Version controllable

### 2. **Type-Safe** 🔒
- Full TypeScript support
- Zod schema validation
- Compile-time type checking

### 3. **Approval-Aware** ✋
- Built-in approval gates
- Human-in-the-loop by default
- Safe AI-assisted development

### 4. **OpenCode-Native** 🔌
- Integrates with existing agent system
- Uses OpenAgents' visibility controls
- Works with current configuration

### 5. **Lightweight** 🪶
- Minimal dependencies
- Simple implementation (~300 lines)
- Easy to understand and debug

---

## Architecture

### 1. Workflow Definition Schema

```typescript
interface WorkflowDefinition {
  id: string
  description: string
  visible_to?: string[]  // Visibility control
  steps: WorkflowStep[]
  context?: Record<string, any>
}

interface WorkflowStep {
  id: string
  type: "agent" | "approval" | "parallel" | "condition"
  
  // Agent step
  agent?: string
  input?: string  // Reference to previous step output
  
  // Approval step
  message?: string
  
  // Parallel step
  agents?: string[]
  
  // Routing
  on_success?: string
  on_error?: string
  on_approve?: string
  on_reject?: string
  
  // Retry logic
  max_retries?: number
  retry_delay?: number
}
```

### 2. Workflow Context (Immutable)

```typescript
interface WorkflowContext {
  readonly workflowId: string
  readonly input: any
  readonly results: ReadonlyMap<string, StepResult>
  readonly metadata: {
    readonly startTime: Date
    readonly currentStep: string
    readonly previousSteps: string[]
  }
  
  // Immutable updates
  addResult(stepId: string, result: any): WorkflowContext
  getResult(stepId: string): any | undefined
}
```

### 3. Workflow Nodes

```typescript
abstract class WorkflowNode {
  constructor(protected step: WorkflowStep) {}
  
  // Three-phase execution (inspired by PocketFlow)
  abstract prepare(context: WorkflowContext): Promise<PrepResult>
  abstract execute(prepResult: PrepResult): Promise<ExecResult>
  abstract route(context: WorkflowContext, execResult: ExecResult): Promise<string>
  
  async run(context: WorkflowContext): Promise<NodeResult> {
    const prep = await this.prepare(context)
    const exec = await this.executeWithRetry(prep)
    const action = await this.route(context, exec)
    const newContext = context.addResult(this.step.id, exec)
    
    return { action, context: newContext }
  }
  
  private async executeWithRetry(prep: PrepResult): Promise<ExecResult> {
    const maxRetries = this.step.max_retries || 1
    const delay = this.step.retry_delay || 0
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.execute(prep)
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await sleep(delay * Math.pow(2, i))  // Exponential backoff
      }
    }
  }
}
```

### 4. Node Types

#### Agent Node
```typescript
class AgentNode extends WorkflowNode {
  async prepare(context: WorkflowContext): Promise<PrepResult> {
    const agent = await loadAgent(this.step.agent!)
    const input = this.step.input 
      ? context.getResult(this.step.input)
      : context.input
    return { agent, input }
  }
  
  async execute(prep: PrepResult): Promise<ExecResult> {
    return await prep.agent.execute(prep.input)
  }
  
  async route(context: WorkflowContext, exec: ExecResult): Promise<string> {
    return exec.success ? "success" : "error"
  }
}
```

#### Approval Node
```typescript
class ApprovalNode extends WorkflowNode {
  async execute(prep: PrepResult): Promise<ExecResult> {
    const approved = await showApprovalPrompt(this.step.message!)
    return { approved }
  }
  
  async route(context: WorkflowContext, exec: ExecResult): Promise<string> {
    return exec.approved ? "approve" : "reject"
  }
}
```

#### Parallel Node
```typescript
class ParallelNode extends WorkflowNode {
  async execute(prep: PrepResult): Promise<ExecResult> {
    const results = await Promise.all(
      this.step.agents!.map(agent => executeAgent(agent, prep.input))
    )
    return { results, success: results.every(r => r.success) }
  }
}
```

### 5. Workflow Executor

```typescript
class WorkflowExecutor {
  async execute(
    workflow: WorkflowDefinition,
    input: any,
    options?: ExecutionOptions
  ): Promise<WorkflowResult> {
    let context = this.createContext(workflow.id, input)
    let currentStep = workflow.steps[0]
    
    // Track progress
    const tracker = createTaskTracker()
    tracker.start(workflow.id, "workflow-execution")
    
    try {
      while (currentStep) {
        // Create node for current step
        const node = this.createNode(currentStep)
        
        // Execute node
        const { action, context: newContext } = await node.run(context)
        
        // Update context
        context = newContext
        
        // Get next step based on action
        currentStep = this.getNextStep(workflow, currentStep, action)
        
        // Show progress
        await this.showProgress(workflow, currentStep, context)
      }
      
      tracker.complete("workflow-execution")
      return { context, success: true }
      
    } catch (error) {
      tracker.error("workflow-execution", error.message)
      return { context, success: false, error }
    }
  }
  
  private createNode(step: WorkflowStep): WorkflowNode {
    switch (step.type) {
      case "agent": return new AgentNode(step)
      case "approval": return new ApprovalNode(step)
      case "parallel": return new ParallelNode(step)
      default: throw new Error(`Unknown step type: ${step.type}`)
    }
  }
  
  private getNextStep(
    workflow: WorkflowDefinition,
    current: WorkflowStep,
    action: string
  ): WorkflowStep | null {
    const nextId = current[`on_${action}`] || current.on_success
    if (!nextId || nextId === "end") return null
    
    return workflow.steps.find(s => s.id === nextId) || null
  }
}
```

---

## Configuration Integration

### File Structure

```
.openagents/
├── config.json          # Main config
├── workflows/           # Workflow definitions
│   ├── feature-dev.json
│   ├── bug-fix.json
│   ├── refactor.json
│   └── deploy.json
└── agents/              # Agent definitions
    ├── planner.md
    ├── coder.md
    ├── tester.md
    └── reviewer.md
```

### Config Schema Extension

```typescript
export const OpenAgentsConfigSchema = z.object({
  // ... existing config ...
  
  // Workflow configuration
  workflows_dir: z.string().default("./workflows"),
  workflows: z.record(WorkflowDefinitionSchema).optional(),
  default_workflow: z.string().optional(),
})
```

### Workflow Schema

```typescript
export const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.enum(["agent", "approval", "parallel", "condition"]),
  agent: z.string().optional(),
  agents: z.array(z.string()).optional(),
  message: z.string().optional(),
  input: z.string().optional(),
  on_success: z.string().optional(),
  on_error: z.string().optional(),
  on_approve: z.string().optional(),
  on_reject: z.string().optional(),
  max_retries: z.number().positive().optional(),
  retry_delay: z.number().nonnegative().optional(),
})

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  description: z.string(),
  visible_to: z.array(z.string()).optional(),
  steps: z.array(WorkflowStepSchema),
  context: z.record(z.any()).optional(),
})
```

---

## Example Workflows

### 1. Feature Development
```json
{
  "id": "feature-development",
  "description": "Complete feature development workflow",
  "visible_to": ["plan", "build"],
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "on_success": "approve-plan"
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
      "on_success": "test",
      "on_error": "end"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "max_retries": 3,
      "retry_delay": 1000,
      "on_success": "review",
      "on_error": "code"
    },
    {
      "id": "review",
      "type": "agent",
      "agent": "reviewer",
      "on_success": "approve-deploy",
      "on_error": "code"
    },
    {
      "id": "approve-deploy",
      "type": "approval",
      "message": "Deploy changes?",
      "on_approve": "end",
      "on_reject": "end"
    }
  ]
}
```

### 2. Bug Fix Workflow
```json
{
  "id": "bug-fix",
  "description": "Quick bug fix workflow",
  "steps": [
    {
      "id": "diagnose",
      "type": "agent",
      "agent": "researcher",
      "on_success": "fix"
    },
    {
      "id": "fix",
      "type": "agent",
      "agent": "coder",
      "input": "diagnose",
      "on_success": "test"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "max_retries": 2,
      "on_success": "end",
      "on_error": "fix"
    }
  ]
}
```

### 3. Comprehensive Testing
```json
{
  "id": "comprehensive-test",
  "description": "Run all tests in parallel",
  "steps": [
    {
      "id": "parallel-tests",
      "type": "parallel",
      "agents": ["test-unit", "test-integration", "test-e2e"],
      "on_success": "report",
      "on_error": "end"
    },
    {
      "id": "report",
      "type": "agent",
      "agent": "reporter",
      "input": "parallel-tests",
      "on_success": "end"
    }
  ]
}
```

### 4. Refactoring Workflow
```json
{
  "id": "refactor",
  "description": "Safe refactoring with validation",
  "steps": [
    {
      "id": "analyze",
      "type": "agent",
      "agent": "analyzer",
      "on_success": "approve-refactor"
    },
    {
      "id": "approve-refactor",
      "type": "approval",
      "message": "Proceed with refactoring?",
      "on_approve": "refactor",
      "on_reject": "end"
    },
    {
      "id": "refactor",
      "type": "agent",
      "agent": "coder",
      "input": "analyze",
      "on_success": "validate"
    },
    {
      "id": "validate",
      "type": "parallel",
      "agents": ["tester", "reviewer", "linter"],
      "on_success": "end",
      "on_error": "refactor"
    }
  ]
}
```

---

## CLI Integration

### Commands

```bash
# List available workflows
opencode workflow list

# Show workflow details
opencode workflow show feature-development

# Run a workflow
opencode workflow run feature-development --input "Add dark mode"

# Run with custom context
opencode workflow run bug-fix --context '{"issue": "#123"}'

# Validate workflow definition
opencode workflow validate feature-development

# Create new workflow from template
opencode workflow create my-workflow --template feature-development
```

### Agent Integration

Users can also trigger workflows via natural language:

```
User: "Use the feature-development workflow to add a dark mode toggle"
Agent: "Starting feature-development workflow..."
       "Step 1/6: Planning..."
       "Step 2/6: Waiting for approval..."
```

---

## Benefits

### 1. **Reduced Boilerplate** 📉
**Before:**
```typescript
// Custom orchestration code
const plan = await plannerAgent.execute(input)
const approved = await getApproval(plan)
if (!approved) return
const code = await coderAgent.execute(plan)
const tests = await testerAgent.execute(code)
// ... more manual coordination
```

**After:**
```json
{
  "workflow": "feature-development",
  "input": "Add dark mode"
}
```

### 2. **Reusable Patterns** ♻️
- Save workflows as templates
- Share across projects
- Version control workflows
- Build workflow library

### 3. **Improved Safety** 🔒
- Approval gates enforced
- Retry logic built-in
- Error handling standardized
- Audit trail automatic

### 4. **Better Scalability** 📈
- Add agents without changing workflows
- Parallel execution for performance
- Conditional branching for flexibility
- Easy to onboard new team members

### 5. **Enhanced Visibility** 👁️
- Progress tracking
- Toast notifications
- Workflow status
- Result history

---

## Implementation Plan

### Phase 1: Core Engine (Week 1)
- [ ] Create workflow schema (Zod)
- [ ] Implement WorkflowNode base class
- [ ] Implement AgentNode
- [ ] Implement WorkflowExecutor
- [ ] Add sequential execution
- [ ] Add basic error handling
- [ ] Write unit tests

### Phase 2: Advanced Nodes (Week 2)
- [ ] Implement ApprovalNode
- [ ] Implement ParallelNode
- [ ] Add retry logic with backoff
- [ ] Add context passing
- [ ] Add progress tracking
- [ ] Write integration tests

### Phase 3: Configuration Integration (Week 3)
- [ ] Load workflows from config
- [ ] Integrate with agent loader
- [ ] Add visibility controls
- [ ] Add workflow validation
- [ ] Update config schema
- [ ] Write config tests

### Phase 4: CLI & UI (Week 4)
- [ ] Add CLI commands
- [ ] Add workflow status toasts
- [ ] Add progress indicators
- [ ] Add workflow debugging
- [ ] Add error reporting
- [ ] Write CLI tests

### Phase 5: Documentation & Examples (Week 5)
- [ ] Write workflow guide
- [ ] Create example workflows
- [ ] Add cookbook recipes
- [ ] Write migration guide
- [ ] Update README
- [ ] Create video tutorial

---

## Success Metrics

### Adoption
- [ ] 50% of users create at least one workflow
- [ ] 10+ example workflows in library
- [ ] 5+ community-contributed workflows

### Usage
- [ ] 80% of multi-agent tasks use workflows
- [ ] Average workflow has 4+ steps
- [ ] 90% of workflows include approval gates

### Quality
- [ ] 95% workflow success rate
- [ ] <5% workflow errors
- [ ] <100ms overhead per step

---

## Risks & Mitigations

### Risk 1: Complexity Creep
**Risk:** Workflow system becomes too complex  
**Mitigation:** Start simple, add features incrementally, maintain 80/20 rule

### Risk 2: Performance Overhead
**Risk:** Workflow execution adds latency  
**Mitigation:** Benchmark each step, optimize hot paths, use async/await

### Risk 3: Breaking Changes
**Risk:** Workflow system breaks existing functionality  
**Mitigation:** Opt-in by default, comprehensive tests, gradual rollout

### Risk 4: User Confusion
**Risk:** Users don't understand workflows  
**Mitigation:** Excellent documentation, example workflows, video tutorials

---

## Open Questions

1. **Should workflows be versioned?**
   - Option A: Version in filename (feature-dev-v1.json)
   - Option B: Version in config (version: "1.0.0")
   - Option C: No versioning (use git)

2. **How to handle long-running workflows?**
   - Option A: Block until complete
   - Option B: Background execution with notifications
   - Option C: Pause/resume support

3. **Should workflows support loops?**
   - Option A: Yes (with max iterations)
   - Option B: No (use retry logic instead)
   - Option C: Limited (only for error recovery)

4. **How to debug workflows?**
   - Option A: Verbose logging
   - Option B: Step-by-step execution
   - Option C: Workflow visualizer

---

## Next Steps

1. **Review this proposal** - Get feedback from team
2. **Create prototype** - Build minimal working version
3. **Test with examples** - Validate against real use cases
4. **Iterate on design** - Refine based on feedback
5. **Implement full system** - Build production version
6. **Document thoroughly** - Write guides and examples
7. **Release as beta** - Get community feedback
8. **Iterate and improve** - Based on usage data

---

**Status**: Ready for review and feedback  
**Next Action**: Discuss and approve proposal

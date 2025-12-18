# PocketFlow Analysis for OpenAgents Integration

**Date**: Dec 18, 2025  
**Purpose**: Analyze PocketFlow's design and evaluate integration options

---

## PocketFlow Core Design

### Architecture Overview

PocketFlow uses a **node-graph execution model** with three key phases:

```
prep() → exec() → post()
   ↓        ↓        ↓
 Input   Execute   Route
```

### Key Classes

#### 1. **BaseNode** - Foundation
```python
class BaseNode:
    def prep(self, shared):     # Prepare inputs from shared context
    def exec(self, prep_res):   # Execute node logic
    def post(self, shared, prep_res, exec_res):  # Post-process and route
    def next(self, node, action="default"):  # Define successor
```

**Design Insight:** 
- Separation of concerns: input prep, execution, output routing
- Shared context for state management
- Action-based routing for conditional flows

#### 2. **Node** - Retry Logic
```python
class Node(BaseNode):
    def __init__(self, max_retries=1, wait=0):
    def exec_fallback(self, prep_res, exc):  # Handle failures
```

**Design Insight:**
- Built-in retry with exponential backoff
- Fallback mechanism for graceful degradation

#### 3. **Flow** - Orchestration
```python
class Flow(BaseNode):
    def _orch(self, shared, params=None):
        curr = self.start_node
        while curr:
            last_action = curr._run(shared)
            curr = self.get_next_node(curr, last_action)
```

**Design Insight:**
- Flows are nodes themselves (composability)
- Action-based routing between nodes
- Loop-based execution (simple, debuggable)

#### 4. **Async Support**
```python
class AsyncNode(Node):
    async def prep_async(self, shared):
    async def exec_async(self, prep_res):
    async def post_async(self, shared, prep_res, exec_res):
```

**Design Insight:**
- Parallel async/sync APIs
- Async-first for LLM calls

#### 5. **Batch Processing**
```python
class BatchNode(Node):
    def _exec(self, items):
        return [super()._exec(i) for i in items]

class AsyncParallelBatchNode(AsyncNode):
    async def _exec(self, items):
        return await asyncio.gather(*(super()._exec(i) for i in items))
```

**Design Insight:**
- Map-reduce patterns for parallel processing
- Sequential vs parallel batch execution

---

## PocketFlow Strengths

### 1. **Minimalism** ⭐⭐⭐⭐⭐
- Only 100 lines of Python
- Zero dependencies
- Easy to understand and modify

### 2. **Composability** ⭐⭐⭐⭐⭐
- Flows are nodes (recursive composition)
- Can nest flows within flows
- Reusable workflow patterns

### 3. **Flexibility** ⭐⭐⭐⭐⭐
- Sync/async support
- Sequential/parallel execution
- Conditional branching via actions

### 4. **Error Handling** ⭐⭐⭐⭐☆
- Built-in retry logic
- Fallback mechanisms
- Graceful degradation

### 5. **State Management** ⭐⭐⭐⭐☆
- Shared context between nodes
- Explicit state passing
- Mutable state (Python-style)

---

## PocketFlow Weaknesses for OpenAgents

### 1. **Language Mismatch** ❌
- PocketFlow is Python
- OpenAgents is TypeScript
- Would need full port

### 2. **Imperative API** ❌
```python
# PocketFlow requires code
flow = Flow()
node1 = Node()
node2 = Node()
node1.next(node2)
flow.start(node1)
```

**Problem:** Users must write code, can't use config files

### 3. **No Approval Gates** ❌
- PocketFlow doesn't model human-in-the-loop
- No built-in pause/resume
- No user interaction primitives

### 4. **No Visibility Controls** ❌
- No concept of agent visibility
- No permission system
- No access control

### 5. **No OpenCode Integration** ❌
- Doesn't understand OpenCode agents
- No CLI integration
- No toast notifications

### 6. **Mutable Shared State** ⚠️
```python
shared = {}  # Mutable dict
node1._run(shared)  # Can modify shared
node2._run(shared)  # Sees modifications
```

**Problem:** Hard to reason about, potential race conditions

---

## What We Can Learn from PocketFlow

### 1. **Three-Phase Execution** ✅
```
prep() → exec() → post()
```

**Apply to OpenAgents:**
```typescript
class WorkflowNode {
  async prepare(context: WorkflowContext): Promise<PrepResult> {
    // Load agent, prepare inputs
  }
  
  async execute(prepResult: PrepResult): Promise<ExecResult> {
    // Call agent, handle retries
  }
  
  async route(context: WorkflowContext, execResult: ExecResult): Promise<string> {
    // Determine next node based on result
  }
}
```

### 2. **Action-Based Routing** ✅
```python
node1 - "success" >> node2
node1 - "error" >> node3
```

**Apply to OpenAgents:**
```typescript
node.on("success", nextNode)
node.on("error", errorNode)
node.on("retry", retryNode)
```

### 3. **Composable Flows** ✅
```python
class Flow(BaseNode):  # Flow is a node
```

**Apply to OpenAgents:**
```typescript
class Workflow extends WorkflowNode {
  // Workflows can be nested in other workflows
}
```

### 4. **Retry Logic** ✅
```python
for retry in range(max_retries):
    try: return exec()
    except: continue
```

**Apply to OpenAgents:**
```typescript
async executeWithRetry(maxRetries: number, delay: number) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.execute()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(delay * Math.pow(2, i))  // Exponential backoff
    }
  }
}
```

### 5. **Batch Processing** ✅
```python
class BatchNode:
    def _exec(self, items):
        return [super()._exec(i) for i in items]
```

**Apply to OpenAgents:**
```typescript
class BatchWorkflowNode extends WorkflowNode {
  async execute(items: any[]): Promise<any[]> {
    return Promise.all(items.map(item => super.execute(item)))
  }
}
```

---

## What We Should NOT Take from PocketFlow

### 1. **Imperative API** ❌
**PocketFlow:**
```python
flow = Flow()
node1 = Node()
node2 = Node()
node1.next(node2)
```

**Better for OpenAgents:**
```json
{
  "workflow": {
    "steps": [
      { "id": "node1", "next": "node2" },
      { "id": "node2", "next": "end" }
    ]
  }
}
```

### 2. **Mutable Shared State** ❌
**PocketFlow:**
```python
shared = {}  # Mutable
node._run(shared)  # Modifies shared
```

**Better for OpenAgents:**
```typescript
interface WorkflowContext {
  readonly input: any
  readonly results: ReadonlyMap<string, any>
  addResult(nodeId: string, result: any): WorkflowContext
}
```

### 3. **No Type Safety** ❌
**PocketFlow:**
```python
def exec(self, prep_res):  # No types
    return prep_res  # Any type
```

**Better for OpenAgents:**
```typescript
async execute<T, R>(input: T): Promise<R> {
  // Fully typed
}
```

---

## Proposed OpenAgents Workflow Design

### Core Principles

1. **Configuration-first** - Workflows defined in JSON/YAML
2. **Type-safe** - Full TypeScript support
3. **Immutable context** - No mutable shared state
4. **Approval-aware** - Built-in human-in-the-loop
5. **OpenCode-native** - Integrates with existing agent system

### Architecture

```typescript
// 1. Workflow Definition (Config)
interface WorkflowDefinition {
  id: string
  description: string
  steps: WorkflowStep[]
  context?: Record<string, any>
}

interface WorkflowStep {
  id: string
  type: "agent" | "approval" | "parallel" | "condition"
  agent?: string
  on_success?: string
  on_error?: string
  on_approve?: string
  on_reject?: string
  max_retries?: number
  retry_delay?: number
}

// 2. Workflow Context (Immutable)
interface WorkflowContext {
  readonly workflowId: string
  readonly input: any
  readonly results: ReadonlyMap<string, any>
  readonly metadata: ReadonlyMap<string, any>
  
  addResult(stepId: string, result: any): WorkflowContext
  getResult(stepId: string): any | undefined
}

// 3. Workflow Node (Execution)
abstract class WorkflowNode {
  abstract prepare(context: WorkflowContext): Promise<PrepResult>
  abstract execute(prepResult: PrepResult): Promise<ExecResult>
  abstract route(context: WorkflowContext, execResult: ExecResult): Promise<string>
  
  async run(context: WorkflowContext): Promise<{ action: string; context: WorkflowContext }> {
    const prep = await this.prepare(context)
    const exec = await this.execute(prep)
    const action = await this.route(context, exec)
    const newContext = context.addResult(this.id, exec)
    return { action, context: newContext }
  }
}

// 4. Agent Node (Calls OpenCode agent)
class AgentNode extends WorkflowNode {
  constructor(
    private id: string,
    private agentName: string,
    private maxRetries: number = 1,
    private retryDelay: number = 0
  ) { super() }
  
  async prepare(context: WorkflowContext): Promise<PrepResult> {
    // Load agent from OpenAgents registry
    const agent = await loadAgent(this.agentName)
    const input = context.getResult("input") || context.input
    return { agent, input }
  }
  
  async execute(prepResult: PrepResult): Promise<ExecResult> {
    // Execute with retry logic
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await prepResult.agent.execute(prepResult.input)
      } catch (error) {
        if (i === this.maxRetries - 1) throw error
        await sleep(this.retryDelay * Math.pow(2, i))
      }
    }
  }
  
  async route(context: WorkflowContext, execResult: ExecResult): Promise<string> {
    return execResult.success ? "success" : "error"
  }
}

// 5. Approval Node (Human-in-the-loop)
class ApprovalNode extends WorkflowNode {
  constructor(
    private id: string,
    private message: string
  ) { super() }
  
  async prepare(context: WorkflowContext): Promise<PrepResult> {
    return { message: this.message, context }
  }
  
  async execute(prepResult: PrepResult): Promise<ExecResult> {
    // Show approval UI (toast, CLI prompt, etc.)
    const approved = await showApprovalPrompt(prepResult.message)
    return { approved }
  }
  
  async route(context: WorkflowContext, execResult: ExecResult): Promise<string> {
    return execResult.approved ? "approve" : "reject"
  }
}

// 6. Parallel Node (Execute multiple agents concurrently)
class ParallelNode extends WorkflowNode {
  constructor(
    private id: string,
    private agents: string[]
  ) { super() }
  
  async execute(prepResult: PrepResult): Promise<ExecResult> {
    const results = await Promise.all(
      this.agents.map(agent => executeAgent(agent, prepResult.input))
    )
    return { results }
  }
}

// 7. Workflow Executor (Orchestration)
class WorkflowExecutor {
  async execute(
    workflow: WorkflowDefinition,
    input: any
  ): Promise<WorkflowResult> {
    let context = createContext(workflow.id, input)
    let currentStep = workflow.steps[0]
    
    while (currentStep) {
      const node = this.createNode(currentStep)
      const { action, context: newContext } = await node.run(context)
      
      context = newContext
      currentStep = this.getNextStep(workflow, currentStep, action)
    }
    
    return { context, success: true }
  }
  
  private createNode(step: WorkflowStep): WorkflowNode {
    switch (step.type) {
      case "agent":
        return new AgentNode(step.id, step.agent!, step.max_retries, step.retry_delay)
      case "approval":
        return new ApprovalNode(step.id, step.message!)
      case "parallel":
        return new ParallelNode(step.id, step.agents!)
      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }
  
  private getNextStep(
    workflow: WorkflowDefinition,
    currentStep: WorkflowStep,
    action: string
  ): WorkflowStep | null {
    const nextId = currentStep[`on_${action}`] || currentStep.on_success
    if (!nextId || nextId === "end") return null
    
    return workflow.steps.find(s => s.id === nextId) || null
  }
}
```

---

## Example Workflow Configurations

### 1. Simple Sequential Workflow
```json
{
  "id": "feature-development",
  "description": "Plan → Code → Test → Review",
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "on_success": "code",
      "on_error": "end"
    },
    {
      "id": "code",
      "type": "agent",
      "agent": "coder",
      "on_success": "test",
      "on_error": "end"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "on_success": "review",
      "on_error": "code",
      "max_retries": 3
    },
    {
      "id": "review",
      "type": "agent",
      "agent": "reviewer",
      "on_success": "end",
      "on_error": "code"
    }
  ]
}
```

### 2. Workflow with Approval Gate
```json
{
  "id": "deploy-workflow",
  "description": "Build → Test → Approve → Deploy",
  "steps": [
    {
      "id": "build",
      "type": "agent",
      "agent": "builder",
      "on_success": "test"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "on_success": "approve",
      "on_error": "build"
    },
    {
      "id": "approve",
      "type": "approval",
      "message": "Deploy to production?",
      "on_approve": "deploy",
      "on_reject": "end"
    },
    {
      "id": "deploy",
      "type": "agent",
      "agent": "deployer",
      "on_success": "end"
    }
  ]
}
```

### 3. Parallel Execution Workflow
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
      "on_success": "end"
    }
  ]
}
```

---

## Comparison: PocketFlow vs OpenAgents Workflows

| Feature | PocketFlow | OpenAgents Workflows |
|---------|-----------|---------------------|
| **Language** | Python | TypeScript |
| **API Style** | Imperative (code) | Declarative (config) |
| **Type Safety** | ❌ No | ✅ Yes (TypeScript + Zod) |
| **Approval Gates** | ❌ No | ✅ Yes (built-in) |
| **Visibility Controls** | ❌ No | ✅ Yes (integrated) |
| **OpenCode Integration** | ❌ No | ✅ Yes (native) |
| **Retry Logic** | ✅ Yes | ✅ Yes |
| **Parallel Execution** | ✅ Yes | ✅ Yes |
| **Conditional Branching** | ✅ Yes | ✅ Yes |
| **Composability** | ✅ Yes (flows as nodes) | ✅ Yes (workflows as steps) |
| **State Management** | Mutable shared dict | Immutable context |
| **Error Handling** | Fallback methods | Retry + error routes |
| **Batch Processing** | ✅ Yes | ✅ Yes (parallel node) |
| **Async Support** | ✅ Yes | ✅ Yes (async/await) |

---

## Recommendation

### ✅ **Use PocketFlow Concepts, Not Implementation**

**What to adopt:**
1. ✅ Three-phase execution (prep → exec → route)
2. ✅ Action-based routing
3. ✅ Retry logic with backoff
4. ✅ Composable workflows
5. ✅ Batch/parallel processing

**What to adapt:**
1. 🔄 Configuration-first (not code-first)
2. 🔄 Immutable context (not mutable state)
3. 🔄 Type-safe (TypeScript + Zod)
4. 🔄 Approval-aware (human-in-the-loop)
5. 🔄 OpenCode-native (agent integration)

**What to add:**
1. ➕ Visibility controls
2. ➕ Toast notifications
3. ➕ CLI integration
4. ➕ Workflow validation
5. ➕ Progress tracking

---

## Next Steps

1. **Prototype workflow engine** - Build minimal TypeScript implementation
2. **Test with examples** - Validate against real workflows
3. **Integrate with OpenAgents** - Connect to existing agent system
4. **Add CLI commands** - Enable workflow execution
5. **Write documentation** - Guide users on workflow creation

---

**Status**: Ready for prototype implementation

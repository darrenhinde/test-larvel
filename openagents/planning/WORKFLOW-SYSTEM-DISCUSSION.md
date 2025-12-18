# Workflow System Discussion

**Date**: Dec 18, 2025  
**Status**: Planning Phase  
**Goal**: Design a workflow orchestration system for OpenAgents

---

## Problem Statement

### Current State
OpenAgents excels at:
- ✅ Plan-first, approval-based development workflows
- ✅ Safe AI-assisted coding through multi-agent delegation
- ✅ Context-aware standards enforcement
- ✅ Simple markdown-based agent definitions

### Current Limitations
- ❌ **Manual orchestration**: Users must manually coordinate subagent calls
- ❌ **No workflow definitions**: Can't define "plan → approve → execute → validate" flows
- ❌ **Limited task dependencies**: No built-in support for sequential/parallel execution
- ❌ **Boilerplate code**: Custom implementations needed for complex workflows
- ❌ **No graph-like workflows**: Can't model complex, branching execution paths

### User Pain Points
1. **Complex workflows require custom code**: Multi-step processes (e.g., coder → tester → reviewer) need manual coordination
2. **No reusable workflow patterns**: Can't save and share common workflows
3. **Difficult to scale**: Adding more agents increases coordination complexity
4. **No conditional logic**: Can't branch based on results (e.g., if tests fail, retry)
5. **No parallel execution**: Can't run multiple agents concurrently

---

## Proposed Solution: Workflow Orchestration System

### Design Goals
1. **Declarative workflows**: Define workflows in configuration, not code
2. **Graph-based execution**: Support sequential, parallel, and conditional flows
3. **Backward compatible**: Existing agents work without changes
4. **Opt-in**: Users can ignore workflows if they don't need them
5. **Type-safe**: Full TypeScript support
6. **Lightweight**: Minimal dependencies, simple implementation

---

## PocketFlow Analysis

### What is PocketFlow?
PocketFlow is a **100-line Python framework** for building LLM applications as directed graphs:
- **Nodes**: Represent LLM calls, tools, or logic
- **Edges**: Define control flow between nodes
- **Shared state**: Context passed between nodes

### Core Concepts

#### 1. **BaseNode**
```python
class BaseNode:
    def prep(self, shared): pass      # Prepare inputs
    def exec(self, prep_res): pass    # Execute logic
    def post(self, shared, prep_res, exec_res): pass  # Post-process
    def next(self, node, action="default"): ...  # Define successor
```

#### 2. **Flow**
```python
class Flow(BaseNode):
    def _orch(self, shared, params=None):
        curr = self.start_node
        while curr:
            last_action = curr._run(shared)
            curr = self.get_next_node(curr, last_action)
```

#### 3. **Conditional Transitions**
```python
node1 - "success" >> node2  # If node1 returns "success", go to node2
node1 - "error" >> node3    # If node1 returns "error", go to node3
```

### PocketFlow Strengths
- ✅ **Minimal**: Only 100 lines of Python
- ✅ **Flexible**: Supports sync/async, batch, parallel
- ✅ **Graph-based**: Natural for complex workflows
- ✅ **Retry logic**: Built-in retry with backoff
- ✅ **Conditional branching**: Action-based routing

### PocketFlow Weaknesses for OpenAgents
- ❌ **Python-only**: OpenAgents is TypeScript
- ❌ **No approval gates**: Doesn't model human-in-the-loop
- ❌ **No visibility controls**: Doesn't integrate with OpenAgents' visibility system
- ❌ **No OpenCode integration**: Doesn't understand OpenCode's agent system
- ❌ **Imperative API**: Requires code, not configuration

---

## Design Options

### Option 1: Port PocketFlow to TypeScript
**Pros:**
- Proven design pattern
- Minimal code (~100 lines)
- Flexible graph execution

**Cons:**
- Still requires code to define workflows
- Doesn't integrate with OpenAgents' config system
- Adds complexity for simple use cases

### Option 2: Configuration-Based Workflows
**Pros:**
- Declarative (JSON/YAML)
- No code required
- Easy to share and version
- Integrates with existing config system

**Cons:**
- Less flexible than code
- May need custom DSL for complex logic

### Option 3: Hybrid Approach (RECOMMENDED)
**Pros:**
- Simple workflows in config (80% use case)
- Complex workflows in code (20% use case)
- Best of both worlds

**Cons:**
- Two systems to maintain
- Need clear migration path

---

## Recommended Architecture

### 1. Configuration-Based Workflows (Simple)

```json
{
  "workflows": {
    "feature-development": {
      "description": "Plan → Approve → Code → Test → Review",
      "steps": [
        {
          "id": "plan",
          "agent": "planner",
          "on_success": "approve",
          "on_error": "end"
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
          "agent": "coder",
          "on_success": "test",
          "on_error": "end"
        },
        {
          "id": "test",
          "agent": "tester",
          "on_success": "review",
          "on_error": "code"
        },
        {
          "id": "review",
          "agent": "reviewer",
          "on_success": "end",
          "on_error": "code"
        }
      ]
    }
  }
}
```

### 2. TypeScript Workflow API (Advanced)

```typescript
import { Workflow, Node, ApprovalNode } from "openagents/workflow"

const workflow = new Workflow("feature-development")
  .start(new Node("plan", "planner"))
  .then(new ApprovalNode("approve", "Approve plan?"))
  .then(new Node("code", "coder"))
  .then(new Node("test", "tester"))
  .then(new Node("review", "reviewer"))
  .onError("test", "code")  // Retry coding if tests fail
  .onError("review", "code") // Retry coding if review fails

export default workflow
```

### 3. PocketFlow-Inspired Core (Internal)

```typescript
// Internal implementation inspired by PocketFlow
class WorkflowNode {
  async prep(shared: SharedContext): Promise<any> { }
  async exec(prepResult: any): Promise<any> { }
  async post(shared: SharedContext, prepResult: any, execResult: any): Promise<string> { }
  
  next(node: WorkflowNode, action: string = "default"): WorkflowNode {
    this.successors[action] = node
    return node
  }
}

class WorkflowExecutor {
  async run(workflow: Workflow, shared: SharedContext): Promise<any> {
    let current = workflow.startNode
    
    while (current) {
      const prepResult = await current.prep(shared)
      const execResult = await current.exec(prepResult)
      const action = await current.post(shared, prepResult, execResult)
      
      current = current.successors[action] || null
    }
  }
}
```

---

## Key Features to Support

### 1. Sequential Execution
```json
{
  "steps": [
    { "id": "step1", "agent": "agent1", "on_success": "step2" },
    { "id": "step2", "agent": "agent2", "on_success": "end" }
  ]
}
```

### 2. Parallel Execution
```json
{
  "steps": [
    {
      "id": "parallel-tests",
      "type": "parallel",
      "agents": ["test-unit", "test-integration", "test-e2e"],
      "on_success": "review"
    }
  ]
}
```

### 3. Conditional Branching
```json
{
  "steps": [
    {
      "id": "test",
      "agent": "tester",
      "on_success": "deploy",
      "on_error": "fix"
    }
  ]
}
```

### 4. Approval Gates
```json
{
  "steps": [
    {
      "id": "approve-deploy",
      "type": "approval",
      "message": "Deploy to production?",
      "on_approve": "deploy",
      "on_reject": "end"
    }
  ]
}
```

### 5. Retry Logic
```json
{
  "steps": [
    {
      "id": "flaky-test",
      "agent": "tester",
      "max_retries": 3,
      "retry_delay": 1000,
      "on_success": "next",
      "on_error": "end"
    }
  ]
}
```

### 6. Context Passing
```json
{
  "steps": [
    {
      "id": "plan",
      "agent": "planner",
      "output": "plan_result",
      "on_success": "code"
    },
    {
      "id": "code",
      "agent": "coder",
      "input": "plan_result",
      "on_success": "end"
    }
  ]
}
```

---

## Integration with OpenAgents

### 1. Workflow Configuration Location
```
.openagents/
├── config.json          # Main config
├── workflows/           # Workflow definitions
│   ├── feature-dev.json
│   ├── bug-fix.json
│   └── refactor.json
└── agents/              # Agent definitions
    ├── planner.md
    ├── coder.md
    └── tester.md
```

### 2. Workflow Execution
```bash
# CLI integration
opencode workflow run feature-dev

# Or via agent delegation
"Use the feature-dev workflow to implement X"
```

### 3. Visibility Integration
```json
{
  "workflows": {
    "feature-dev": {
      "visible_to": ["plan", "build"],  // Only these agents can use this workflow
      "steps": [ ... ]
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Core Workflow Engine (Week 1)
- [ ] Create workflow schema (Zod)
- [ ] Implement WorkflowNode base class
- [ ] Implement WorkflowExecutor
- [ ] Add sequential execution
- [ ] Add basic error handling

### Phase 2: Advanced Features (Week 2)
- [ ] Add parallel execution
- [ ] Add conditional branching
- [ ] Add retry logic
- [ ] Add approval gates
- [ ] Add context passing

### Phase 3: Configuration Integration (Week 3)
- [ ] Load workflows from config
- [ ] Integrate with agent loader
- [ ] Add visibility controls
- [ ] Add workflow validation

### Phase 4: CLI & UI (Week 4)
- [ ] Add CLI commands
- [ ] Add workflow status toasts
- [ ] Add progress tracking
- [ ] Add workflow debugging

### Phase 5: Documentation & Examples (Week 5)
- [ ] Write workflow guide
- [ ] Create example workflows
- [ ] Add cookbook recipes
- [ ] Write migration guide

---

## Open Questions

### 1. Should we port PocketFlow directly?
**Options:**
- A) Port PocketFlow 1:1 to TypeScript
- B) Use PocketFlow concepts, but adapt to OpenAgents
- C) Build custom solution inspired by PocketFlow

**Recommendation:** Option B - Use concepts, adapt to OpenAgents

### 2. Configuration vs Code?
**Options:**
- A) Configuration-only (JSON/YAML)
- B) Code-only (TypeScript API)
- C) Hybrid (config for simple, code for complex)

**Recommendation:** Option C - Hybrid approach

### 3. How to handle approval gates?
**Options:**
- A) Block workflow execution (wait for user input)
- B) Pause and resume later
- C) Callback-based (notify user, continue when approved)

**Recommendation:** Option A for CLI, Option C for programmatic use

### 4. How to handle context passing?
**Options:**
- A) Shared mutable state (like PocketFlow)
- B) Immutable context with explicit passing
- C) Hybrid (shared read-only, explicit writes)

**Recommendation:** Option C - Hybrid approach

### 5. Should workflows be first-class agents?
**Options:**
- A) Workflows are separate from agents
- B) Workflows are special agents that delegate
- C) Workflows are agent compositions

**Recommendation:** Option B - Workflows as meta-agents

---

## Next Steps

1. **Discuss design options** - Get feedback on architecture
2. **Create prototype** - Build minimal workflow engine
3. **Test with examples** - Validate against real use cases
4. **Iterate on API** - Refine based on feedback
5. **Implement full system** - Build production-ready version

---

## Related Resources

- [PocketFlow GitHub](https://github.com/pocketflow/pocketflow)
- [OpenAgents Architecture](../PLUGIN-SYSTEM-EXPLAINED.md)
- [OpenCode Agent System](https://opencode.ai/docs/agents)

---

**Status**: Ready for discussion and feedback

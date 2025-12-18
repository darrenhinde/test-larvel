# OpenAgents Planning Documents

**Date**: Dec 18, 2025  
**Purpose**: Planning and design documents for OpenAgents enhancements

---

## Overview

This directory contains planning documents for major enhancements to OpenAgents, including:
- Workflow orchestration system
- PocketFlow analysis and integration
- Architecture discussions

---

## Documents

### 1. [WORKFLOW-SYSTEM-DISCUSSION.md](./WORKFLOW-SYSTEM-DISCUSSION.md)
**Purpose:** Initial discussion of workflow system requirements and design options

**Key Topics:**
- Problem statement and user pain points
- Design goals and principles
- PocketFlow analysis
- Design options comparison
- Recommended architecture
- Open questions

**Status:** ✅ Complete - Ready for review

---

### 2. [POCKETFLOW-ANALYSIS.md](./POCKETFLOW-ANALYSIS.md)
**Purpose:** Deep dive into PocketFlow's design and applicability to OpenAgents

**Key Topics:**
- PocketFlow architecture breakdown
- Strengths and weaknesses analysis
- What to adopt vs what to adapt
- Comparison with OpenAgents needs
- Concrete recommendations

**Status:** ✅ Complete - Ready for review

---

### 3. [WORKFLOW-PROPOSAL.md](./WORKFLOW-PROPOSAL.md)
**Purpose:** Formal proposal for workflow system implementation

**Key Topics:**
- Executive summary
- Detailed architecture
- Configuration schema
- Example workflows
- Implementation plan (5 phases)
- Success metrics
- Risk mitigation

**Status:** ✅ Complete - Ready for approval

---

### 4. [WORKFLOW-SPEC-V1.md](./WORKFLOW-SPEC-V1.md) ⭐ **RECOMMENDED**
**Purpose:** Detailed technical specification with focus on simplicity and modularity

**Key Topics:**
- Simple, modular, functional design
- Complete TypeScript implementation examples
- Safety guards (loop protection, timeouts)
- Graceful failure handling
- Parallel execution with context isolation
- Comprehensive testing strategy
- File structure and organization

**Status:** ✅ Complete - Ready for implementation

---

### 5. [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) ⭐ **START HERE**
**Purpose:** Step-by-step implementation plan with clear milestones

**Key Topics:**
- 6 phases with time estimates
- Detailed task breakdown
- Testing strategy per phase
- Success criteria
- Risk mitigation
- ~40 hours total implementation time

**Status:** ✅ Complete - Ready to execute

---

### 6. [CONTEXT-PASSING-SPEC.md](./CONTEXT-PASSING-SPEC.md) ⭐ **CRITICAL**
**Purpose:** How agents share data and update context between workflow steps

**Key Topics:**
- Automatic context injection (default)
- Explicit input references
- Transform steps for data manipulation
- Parallel step context sharing
- Context accumulation patterns
- Complete examples with agent prompts

**Status:** ✅ Complete - Answers "How do agents communicate?"

---

### 7. [context-flow-example.md](./context-flow-example.md) 📊 **VISUAL GUIDE**
**Purpose:** Visual diagrams showing context flow through workflows

**Key Topics:**
- Sequential workflow context flow
- Parallel workflow context sharing
- Explicit reference examples
- Context isolation diagrams

**Status:** ✅ Complete - Visual reference

---

## Quick Summary

### Problem
OpenAgents currently requires manual orchestration of multi-agent workflows. Users must coordinate each step manually, leading to:
- Increased boilerplate code
- No reusable workflow patterns
- Difficult scaling
- Complex coordination

### Solution
Add a **configuration-based workflow system** that enables:
- Declarative workflow definitions (JSON/YAML)
- Sequential, parallel, and conditional execution
- Built-in approval gates
- Retry logic and error handling
- Reusable workflow patterns

### Inspiration
**PocketFlow** - A 100-line Python framework for graph-based LLM orchestration

**What we're adopting:**
- ✅ Three-phase execution (prep → exec → route)
- ✅ Action-based routing
- ✅ Retry logic with backoff
- ✅ Composable workflows
- ✅ Batch/parallel processing

**What we're adapting:**
- 🔄 Configuration-first (not code-first)
- 🔄 Immutable context (not mutable state)
- 🔄 Type-safe (TypeScript + Zod)
- 🔄 Approval-aware (human-in-the-loop)
- 🔄 OpenCode-native (agent integration)

---

## Example Workflow

### Configuration
```json
{
  "id": "feature-development",
  "description": "Complete feature development workflow",
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "on_success": "approve"
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
      "on_success": "test"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "tester",
      "max_retries": 3,
      "on_success": "review",
      "on_error": "code"
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

### Usage
```bash
opencode workflow run feature-development --input "Add dark mode toggle"
```

---

## Architecture Highlights

### 1. **Workflow Definition**
- JSON/YAML configuration
- Zod schema validation
- Type-safe TypeScript interfaces

### 2. **Workflow Nodes**
- AgentNode - Execute OpenAgents agents
- ApprovalNode - Human-in-the-loop gates
- ParallelNode - Concurrent execution
- ConditionNode - Conditional branching (future)

### 3. **Workflow Executor**
- Orchestrates node execution
- Manages context (immutable)
- Handles routing and errors
- Tracks progress

### 4. **Integration**
- Loads from `.openagents/workflows/`
- Uses existing agent system
- Respects visibility controls
- Shows toast notifications

---

## Implementation Plan

### Phase 1: Core Engine (Week 1)
- Workflow schema
- WorkflowNode base class
- AgentNode implementation
- WorkflowExecutor
- Sequential execution
- Unit tests

### Phase 2: Advanced Nodes (Week 2)
- ApprovalNode
- ParallelNode
- Retry logic
- Context passing
- Progress tracking
- Integration tests

### Phase 3: Configuration Integration (Week 3)
- Load workflows from config
- Agent loader integration
- Visibility controls
- Workflow validation
- Config schema updates

### Phase 4: CLI & UI (Week 4)
- CLI commands
- Toast notifications
- Progress indicators
- Debugging tools
- Error reporting

### Phase 5: Documentation & Examples (Week 5)
- Workflow guide
- Example workflows
- Cookbook recipes
- Migration guide
- Video tutorial

---

## Key Design Decisions

### 1. Configuration-First ✅
**Decision:** Workflows defined in JSON/YAML, not code  
**Rationale:** Easier to read, write, share, and version control

### 2. Immutable Context ✅
**Decision:** Context is immutable, updates create new context  
**Rationale:** Easier to reason about, no race conditions, better debugging

### 3. Type-Safe ✅
**Decision:** Full TypeScript + Zod validation  
**Rationale:** Catch errors early, better IDE support, safer refactoring

### 4. Approval-Aware ✅
**Decision:** Built-in approval gates as first-class nodes  
**Rationale:** Human-in-the-loop is core to OpenAgents philosophy

### 5. Lightweight ✅
**Decision:** ~300 lines of core code, minimal dependencies  
**Rationale:** Easy to understand, maintain, and debug

---

## Success Criteria

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

## Open Questions

### 1. Workflow Versioning?
- Option A: Version in filename (feature-dev-v1.json)
- Option B: Version in config (version: "1.0.0")
- Option C: No versioning (use git)

**Recommendation:** Option C initially, add versioning if needed

### 2. Long-Running Workflows?
- Option A: Block until complete
- Option B: Background execution
- Option C: Pause/resume support

**Recommendation:** Option A initially, add Option B if needed

### 3. Workflow Loops?
- Option A: Yes (with max iterations)
- Option B: No (use retry logic)
- Option C: Limited (error recovery only)

**Recommendation:** Option C initially, add Option A if needed

### 4. Workflow Debugging?
- Option A: Verbose logging
- Option B: Step-by-step execution
- Option C: Workflow visualizer

**Recommendation:** Option A initially, add Option B and C later

---

## Next Steps

1. **Review planning documents** ✅ Complete
2. **Discuss with team** ⏳ Pending
3. **Get approval** ⏳ Pending
4. **Create prototype** ⏳ Pending
5. **Test with examples** ⏳ Pending
6. **Implement full system** ⏳ Pending
7. **Document thoroughly** ⏳ Pending
8. **Release as beta** ⏳ Pending

---

## Related Documents

### In This Directory
- [WORKFLOW-SYSTEM-DISCUSSION.md](./WORKFLOW-SYSTEM-DISCUSSION.md) - Initial discussion
- [POCKETFLOW-ANALYSIS.md](./POCKETFLOW-ANALYSIS.md) - PocketFlow deep dive
- [WORKFLOW-PROPOSAL.md](./WORKFLOW-PROPOSAL.md) - Formal proposal

### In Parent Directory
- [../README.md](../README.md) - OpenAgents overview
- [../CONFIGURATION.md](../CONFIGURATION.md) - Configuration guide
- [../PLUGIN-SYSTEM-EXPLAINED.md](../PLUGIN-SYSTEM-EXPLAINED.md) - Plugin architecture

---

## Feedback

We welcome feedback on these planning documents! Please:
1. Review the documents
2. Ask questions
3. Suggest improvements
4. Share use cases

**Contact:** Open an issue or discussion in the repository

---

**Last Updated:** Dec 18, 2025  
**Status:** Ready for review and approval

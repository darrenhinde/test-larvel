# OpenAgents Workflow System - Task Overview

**Date**: Dec 18, 2025  
**Status**: Ready for Implementation  
**Estimated Time**: 40 hours (~5 days)

---

## 🎯 Project Goal

Add a **simple, modular, functional workflow orchestration system** to OpenAgents that enables:
- Declarative workflow definitions (JSON)
- Sequential, parallel, and conditional execution
- Automatic context passing between steps
- Built-in safety guards (loop protection, timeouts)
- Graceful failure handling
- Easy-to-build custom workflows

---

## 📋 Task Breakdown

### Phase 1: Foundation (5 hours)
- [ ] **Task 1.1**: Create type definitions (`types.ts`)
- [ ] **Task 1.2**: Implement context management (`context/context.ts`)
- [ ] **Task 1.3**: Create Zod schemas (`schema.ts`)
- [ ] **Task 1.4**: Write unit tests for foundation

**Deliverable**: Core data structures with immutable context

---

### Phase 2: Basic Execution (6.5 hours)
- [ ] **Task 2.1**: Implement base executor interface (`executors/base.ts`)
- [ ] **Task 2.2**: Implement agent step executor (`executors/agent.ts`)
- [ ] **Task 2.3**: Implement workflow executor (`executor.ts`)
- [ ] **Task 2.4**: Write unit tests for executors

**Deliverable**: Sequential workflows execute correctly

---

### Phase 3: Safety Guards (4 hours)
- [ ] **Task 3.1**: Implement safety guard interface (`guards/base.ts`)
- [ ] **Task 3.2**: Implement iteration guard (`guards/iteration.ts`)
- [ ] **Task 3.3**: Implement duration guard (`guards/duration.ts`)
- [ ] **Task 3.4**: Implement error guard (`guards/error.ts`)
- [ ] **Task 3.5**: Integrate guards into executor
- [ ] **Task 3.6**: Write unit tests for guards

**Deliverable**: Infinite loops and runaway workflows prevented

---

### Phase 4: Advanced Step Types (9 hours)
- [ ] **Task 4.1**: Implement parallel step executor (`executors/parallel.ts`)
- [ ] **Task 4.2**: Implement approval step executor (`executors/approval.ts`)
- [ ] **Task 4.3**: Implement condition step executor (`executors/condition.ts`)
- [ ] **Task 4.4**: Implement transform step executor (`executors/transform.ts`)
- [ ] **Task 4.5**: Update executor registry
- [ ] **Task 4.6**: Write unit tests for advanced steps

**Deliverable**: Parallel, approval, conditional, and transform steps working

---

### Phase 5: Configuration Integration (7 hours)
- [ ] **Task 5.1**: Implement workflow loader (`loader.ts`)
- [ ] **Task 5.2**: Update config schema (`plugin/config.ts`)
- [ ] **Task 5.3**: Integrate with plugin (`plugin/index.ts`)
- [ ] **Task 5.4**: Create example workflows
- [ ] **Task 5.5**: Write integration tests

**Deliverable**: Workflows load from config and execute via plugin

---

### Phase 6: Documentation & Polish (9 hours)
- [ ] **Task 6.1**: Write workflow guide (`WORKFLOW-GUIDE.md`)
- [ ] **Task 6.2**: Create cookbook examples (`WORKFLOW-COOKBOOK.md`)
- [ ] **Task 6.3**: Update main README
- [ ] **Task 6.4**: Add CLI commands (if applicable)
- [ ] **Task 6.5**: Final testing and bug fixes

**Deliverable**: Complete documentation and polished system

---

## 📊 Progress Tracking

| Phase | Tasks | Estimated | Status |
|-------|-------|-----------|--------|
| Phase 1: Foundation | 4 | 5h | ⏳ Not Started |
| Phase 2: Basic Execution | 4 | 6.5h | ⏳ Not Started |
| Phase 3: Safety Guards | 6 | 4h | ⏳ Not Started |
| Phase 4: Advanced Steps | 6 | 9h | ⏳ Not Started |
| Phase 5: Configuration | 5 | 7h | ⏳ Not Started |
| Phase 6: Documentation | 5 | 9h | ⏳ Not Started |
| **Total** | **30 tasks** | **40.5h** | **0% Complete** |

---

## 🎯 Success Criteria

### Functionality
- [ ] Sequential workflows execute correctly
- [ ] Parallel workflows execute concurrently
- [ ] Approval gates block execution
- [ ] Conditional branching works
- [ ] Context passes between steps automatically
- [ ] Error routing works
- [ ] Retry logic works

### Safety
- [ ] Infinite loops prevented (max_iterations)
- [ ] Runaway workflows prevented (max_duration_ms)
- [ ] Error cascades prevented (max_errors)
- [ ] Graceful failures (Promise.allSettled)

### Performance
- [ ] <50ms overhead per step
- [ ] Parallel execution faster than sequential
- [ ] No memory leaks

### Quality
- [ ] 90%+ test coverage
- [ ] All edge cases covered
- [ ] Clear error messages
- [ ] Good documentation

---

## 📁 File Structure

```
src/
├── workflow/
│   ├── index.ts                 # Public API
│   ├── types.ts                 # TypeScript interfaces
│   ├── schema.ts                # Zod schemas
│   │
│   ├── context/
│   │   ├── context.ts           # Context management
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

## 🔗 Related Documents

### Planning Documents
- [WORKFLOW-SPEC-V1.md](../planning/WORKFLOW-SPEC-V1.md) - Complete technical specification
- [CONTEXT-PASSING-SPEC.md](../planning/CONTEXT-PASSING-SPEC.md) - Context passing details
- [IMPLEMENTATION-ROADMAP.md](../planning/IMPLEMENTATION-ROADMAP.md) - Detailed roadmap
- [context-flow-example.md](../planning/context-flow-example.md) - Visual examples

### Task Details
- [Phase 1: Foundation](./phase-1-foundation.md)
- [Phase 2: Basic Execution](./phase-2-basic-execution.md)
- [Phase 3: Safety Guards](./phase-3-safety-guards.md)
- [Phase 4: Advanced Steps](./phase-4-advanced-steps.md)
- [Phase 5: Configuration](./phase-5-configuration.md)
- [Phase 6: Documentation](./phase-6-documentation.md)

---

## 🚀 Getting Started

### Step 1: Review Planning Documents
Read the following in order:
1. [WORKFLOW-SPEC-V1.md](../planning/WORKFLOW-SPEC-V1.md) - Understand the design
2. [CONTEXT-PASSING-SPEC.md](../planning/CONTEXT-PASSING-SPEC.md) - Understand context flow
3. [IMPLEMENTATION-ROADMAP.md](../planning/IMPLEMENTATION-ROADMAP.md) - Understand the plan

### Step 2: Start Phase 1
1. Create branch: `git checkout -b feature/workflow-system`
2. Start with [Phase 1: Foundation](./phase-1-foundation.md)
3. Complete tasks in order
4. Run tests after each task
5. Commit frequently

### Step 3: Progress Through Phases
- Complete one phase at a time
- Run all tests before moving to next phase
- Update progress in this document
- Ask for review at phase boundaries

---

## 📝 Notes

### Design Principles
1. **Simple** - One workflow = one JSON file
2. **Modular** - Each component has single responsibility
3. **Functional** - Pure functions, immutable data
4. **Safe** - Loop protection, timeouts, graceful failures
5. **Performant** - Parallel execution, lazy loading

### Key Features
- **Automatic context injection** - Steps receive all previous results
- **Explicit references** - Steps can reference specific previous steps
- **Immutable context** - No mutations, no race conditions
- **Parallel isolation** - Parallel steps share read-only context
- **Safety guards** - Prevent infinite loops and runaway workflows

### Testing Strategy
- **Unit tests** - Pure functions (context, guards, conditions)
- **Integration tests** - Step executors with mock agents
- **End-to-end tests** - Complete workflows
- **Coverage goal** - 90%+

---

## ❓ Questions?

- Review planning documents in `/planning`
- Check task details in `/tasks/phase-*.md`
- Refer to examples in planning documents

---

**Ready to start? Begin with [Phase 1: Foundation](./phase-1-foundation.md)** 🚀

# What's Next After OpenCode Integration

**Status:** Planning Complete ✅  
**Tasks Created:** 5 tasks in `/tasks/workflow-opencode-integration/`  
**Estimated Total Time:** 4 hours

---

## 🎯 Immediate Next Steps (Phase 2.5)

### 1. Execute the Tasks (4 hours)

Work through the tasks in sequence:

1. **Task 01** - Implement OpenCodeAgentExecutor (45 min)
   - Create `src/workflow/opencode-agent-executor.ts`
   - Use `client.session.*` APIs
   - Handle session lifecycle

2. **Task 02** - Integrate with Plugin (30 min)
   - Update `src/plugin/index.ts`
   - Register `/workflow` command
   - Wire up executor

3. **Task 03** - Create Example Workflows (15 min)
   - Create `.openagents/workflows/` directory
   - Add `feature.json`, `analyze.json`, `refactor.json`
   - Add README

4. **Task 04** - Test and Validate (30 min)
   - Run all 8 test scenarios
   - Verify everything works
   - Document issues

5. **Task 05** - Documentation (1 hour)
   - Update README
   - Create user guides
   - Add troubleshooting

**Result:** Working workflow system that orchestrates real OpenCode agents

---

## 🚀 After Phase 2.5 is Complete

### Phase 3: Parallel Execution (4-6 hours)

**Goal:** Support running multiple agents concurrently

**Tasks:**
1. Add DAG-based dependency resolution
2. Implement parallel executor
3. Support fan-out/fan-in patterns
4. Test concurrent execution

**Example:**
```json
{
  "steps": [
    { "id": "plan" },
    { "id": "frontend", "depends": ["plan"] },  // Parallel
    { "id": "backend", "depends": ["plan"] },   // Parallel
    { "id": "test", "depends": ["frontend", "backend"] }
  ]
}
```

**Benefits:**
- ✅ Faster execution (parallel agents)
- ✅ Better resource utilization
- ✅ More complex workflows

---

### Phase 4: Skills Integration (2-3 hours)

**Goal:** Seamless integration with skills plugin

**Tasks:**
1. Skills plugin registers agents
2. Test skills in workflows
3. Document skill patterns
4. Add skill examples

**Example:**
```json
{
  "steps": [
    { "agent": "skill-file-search" },
    { "agent": "skill-refactor" }
  ]
}
```

**Benefits:**
- ✅ Skills work like any agent
- ✅ No special syntax
- ✅ Composable workflows

---

### Phase 5: Visualization & DX (3-4 hours)

**Goal:** Make workflows easy to understand and debug

**Tasks:**
1. Generate Mermaid diagrams from workflows
2. Add workflow builder API
3. Support YAML format
4. Add execution history/debugging

**Example:**
```typescript
// Generate diagram
const diagram = workflowToMermaid(workflow)
// Output: Mermaid graph showing workflow flow

// Builder API
const workflow = new WorkflowBuilder()
  .step("plan", { agent: "plan" })
  .step("build", { agent: "build", dependsOn: ["plan"] })
  .build()
```

**Benefits:**
- ✅ Easy to visualize workflows
- ✅ Better debugging
- ✅ Improved developer experience

---

## 🔧 Technical Improvements Needed

### 1. Fix Test Infrastructure (1 hour)

**Current Issues:**
- 5 test files have broken imports (moved to `/test`)
- 2 plugin registration tests failing
- 1 config test failing (model name mismatch)

**Fix:**
```bash
# Update import paths in test files
# Fix config test expectations
# Debug plugin registration
# Verify all 108 tests pass
```

**Priority:** Medium (not blocking workflow work)

---

### 2. Optimize Session Management (2 hours)

**Current Approach:**
- Create session per agent step
- Poll for completion every 500ms
- Cleanup after completion

**Improvements:**
- Session pooling (reuse sessions)
- WebSocket for real-time updates (no polling)
- Batch session operations

**Benefits:**
- ✅ Faster execution
- ✅ Less resource usage
- ✅ Better performance

**Priority:** Low (optimize later)

---

### 3. Add Direct Execution Mode (8-12 hours)

**Goal:** Fast, lightweight agent execution without sessions

**Approach:**
- Call LLM APIs directly
- Manage tools/MCPs ourselves
- No session overhead

**Benefits:**
- ✅ Much faster (~100ms vs ~2s)
- ✅ Better for simple agents
- ✅ Parallel execution easier

**Challenges:**
- ❌ Need to implement tool execution
- ❌ Need to implement MCP protocol
- ❌ Need to handle permissions
- ❌ More complex, more maintenance

**Priority:** Low (only if session mode is too slow)

---

## 🎨 Feature Enhancements

### 1. Workflow Templates (1-2 hours)

**Goal:** Pre-built workflow templates for common tasks

**Examples:**
- `feature-full` - Complete feature development
- `bug-fix` - Bug investigation and fix
- `refactor-safe` - Safe refactoring with validation
- `documentation` - Generate documentation
- `code-review` - Comprehensive code review

**Implementation:**
- Create template workflows
- Add template command (`/workflow template <name>`)
- Allow customization

---

### 2. Workflow Variables (2-3 hours)

**Goal:** Parameterize workflows with variables

**Example:**
```json
{
  "variables": {
    "model": "anthropic/claude-sonnet-4",
    "timeout": 120000
  },
  "steps": [
    {
      "agent": "plan",
      "model": "${model}",
      "timeout_ms": "${timeout}"
    }
  ]
}
```

**Benefits:**
- ✅ Reusable workflows
- ✅ Easy customization
- ✅ Environment-specific configs

---

### 3. Workflow Composition (3-4 hours)

**Goal:** Workflows can call other workflows

**Example:**
```json
{
  "steps": [
    { "type": "workflow", "workflow": "analyze" },
    { "type": "workflow", "workflow": "refactor" }
  ]
}
```

**Benefits:**
- ✅ Modular workflows
- ✅ Reusable components
- ✅ Better organization

---

### 4. Approval Steps (2-3 hours)

**Goal:** Human-in-the-loop workflows

**Example:**
```json
{
  "steps": [
    { "agent": "plan" },
    { "type": "approval", "message": "Approve plan?" },
    { "agent": "build" }
  ]
}
```

**Benefits:**
- ✅ Human oversight
- ✅ Safety for critical operations
- ✅ Interactive workflows

---

### 5. Workflow Persistence (3-4 hours)

**Goal:** Save and resume workflows

**Features:**
- Save workflow state to disk
- Resume from last step
- Workflow history
- Replay workflows

**Benefits:**
- ✅ Survive crashes
- ✅ Long-running workflows
- ✅ Debugging and analysis

---

## 📊 Priority Matrix

| Feature | Priority | Effort | Impact | When |
|---------|----------|--------|--------|------|
| **Phase 2.5: OpenCode Integration** | 🔴 Critical | 4h | ⭐⭐⭐⭐⭐ | **NOW** |
| Fix Test Infrastructure | 🟡 Medium | 1h | ⭐⭐⭐ | After 2.5 |
| **Phase 3: Parallel Execution** | 🟡 High | 6h | ⭐⭐⭐⭐⭐ | After 2.5 |
| **Phase 4: Skills Integration** | 🟡 High | 3h | ⭐⭐⭐⭐ | After 3 |
| **Phase 5: Visualization** | 🟢 Medium | 4h | ⭐⭐⭐⭐ | After 4 |
| Workflow Templates | 🟢 Medium | 2h | ⭐⭐⭐ | After 5 |
| Workflow Variables | 🟢 Medium | 3h | ⭐⭐⭐ | After 5 |
| Approval Steps | 🟢 Low | 3h | ⭐⭐⭐ | Later |
| Workflow Composition | 🟢 Low | 4h | ⭐⭐⭐ | Later |
| Workflow Persistence | 🟢 Low | 4h | ⭐⭐ | Later |
| Session Optimization | 🟢 Low | 2h | ⭐⭐ | Later |
| Direct Execution Mode | 🟢 Low | 12h | ⭐⭐⭐ | Much Later |

---

## 🎯 Recommended Roadmap

### Week 1: Foundation
- ✅ Complete Phase 2.5 (OpenCode Integration) - 4 hours
- ✅ Fix test infrastructure - 1 hour
- ✅ Test with real workflows - 2 hours

**Outcome:** Working workflow system with real agents

---

### Week 2: Parallel Execution
- ✅ Implement Phase 3 (Parallel Execution) - 6 hours
- ✅ Test parallel workflows - 2 hours
- ✅ Document parallel patterns - 1 hour

**Outcome:** Workflows can run agents in parallel

---

### Week 3: Skills & Visualization
- ✅ Implement Phase 4 (Skills Integration) - 3 hours
- ✅ Implement Phase 5 (Visualization) - 4 hours
- ✅ Create workflow templates - 2 hours

**Outcome:** Skills work seamlessly, workflows are easy to visualize

---

### Week 4: Enhancements
- ✅ Add workflow variables - 3 hours
- ✅ Add approval steps - 3 hours
- ✅ Optimize session management - 2 hours

**Outcome:** Advanced workflow features

---

### Future: Advanced Features
- Workflow composition
- Workflow persistence
- Direct execution mode
- Advanced debugging tools

---

## 🚦 Success Metrics

### Phase 2.5 Success
- [ ] `/workflow` command works
- [ ] Workflows execute real agents
- [ ] Context passes between steps
- [ ] Tools and MCPs work
- [ ] Error handling works
- [ ] Documentation complete

### Phase 3 Success
- [ ] Parallel execution works
- [ ] DAG dependencies work
- [ ] Fan-out/fan-in works
- [ ] Performance improved

### Phase 4 Success
- [ ] Skills work in workflows
- [ ] No special syntax needed
- [ ] Skills are composable

### Phase 5 Success
- [ ] Workflows visualized
- [ ] Easy to understand
- [ ] Good debugging tools

---

## 💡 Key Decisions to Make

### 1. Parallel Execution Strategy
**Question:** How to implement parallel execution?

**Options:**
- A) Multiple sessions in parallel (simple, works with current code)
- B) Direct execution mode (complex, better performance)
- C) Hybrid (both options available)

**Recommendation:** Start with A, add B later if needed

---

### 2. Skills Integration Approach
**Question:** How should skills integrate?

**Options:**
- A) Skills as agents (recommended - consistent interface)
- B) Custom step types (more complex)
- C) Both

**Recommendation:** A (skills as agents)

---

### 3. Visualization Format
**Question:** What format for visualization?

**Options:**
- A) Mermaid diagrams (simple, works everywhere)
- B) Interactive UI (complex, better UX)
- C) Both

**Recommendation:** Start with A, add B later

---

### 4. Workflow Format
**Question:** Support multiple formats?

**Options:**
- A) JSON only (simple)
- B) JSON + YAML (more readable)
- C) JSON + YAML + TypeScript (most flexible)

**Recommendation:** B (JSON + YAML)

---

## 📝 Notes for Implementation

### Keep in Mind
1. **Start simple** - Get basic working first
2. **Test incrementally** - Test each phase thoroughly
3. **Document as you go** - Don't leave docs for later
4. **Get feedback early** - Test with real users
5. **Iterate based on usage** - Let real usage guide priorities

### Common Pitfalls to Avoid
1. **Over-engineering** - Don't add features you don't need yet
2. **Premature optimization** - Get it working first, optimize later
3. **Poor error messages** - Invest in good error messages
4. **Skipping tests** - Test everything thoroughly
5. **Incomplete docs** - Document everything

### Best Practices
1. **One feature at a time** - Complete each phase fully
2. **Backward compatibility** - Don't break existing workflows
3. **Clear migration paths** - Help users upgrade
4. **Performance monitoring** - Track execution times
5. **User feedback** - Listen to users

---

## 🎉 Summary

### What We Have Now
- ✅ Solid workflow foundation (7/7 tests passing)
- ✅ Clear architecture and design
- ✅ Comprehensive documentation
- ✅ 5 implementation tasks ready

### What We're Building Next
- 🚀 Phase 2.5: OpenCode Integration (4 hours)
- 🚀 Phase 3: Parallel Execution (6 hours)
- 🚀 Phase 4: Skills Integration (3 hours)
- 🚀 Phase 5: Visualization (4 hours)

### What We'll Have After
- ✅ Working workflow system
- ✅ Real agent orchestration
- ✅ Parallel execution
- ✅ Skills integration
- ✅ Easy visualization
- ✅ Production-ready system

---

## 🚀 Ready to Start?

1. **Review the tasks** in `/tasks/workflow-opencode-integration/`
2. **Start with Task 01** - Implement OpenCodeAgentExecutor
3. **Work through sequentially** - Complete each task fully
4. **Test thoroughly** - Verify everything works
5. **Document as you go** - Keep docs up to date

**Estimated time to working system: 4 hours**

**Let's build this! 🎯**

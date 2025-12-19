# Workflow System Documentation

**Declarative workflow orchestration for OpenAgents**

---

## 🎯 **What is the Workflow System?**

The Workflow System enables you to orchestrate multi-agent tasks using simple JSON definitions. No code required - just define your workflow and let the system handle execution.

### **Key Features**
- ✅ **Declarative** - Define workflows in JSON
- ✅ **Automatic Context Passing** - Steps share data automatically
- ✅ **Parallel Execution** - Run steps concurrently
- ✅ **Safety Guards** - Prevent infinite loops and runaway workflows
- ✅ **Graceful Failures** - Retry logic and error recovery
- ✅ **Type-Safe** - Full TypeScript support

---

## 📚 **Documentation**

### **Getting Started**
- **[Quick Start](./QUICK-START.md)** - 5-minute setup guide
- **[Workflow Guide](./WORKFLOW-GUIDE.md)** - Complete workflow reference
- **[Agent Integration](./AGENT-INTEGRATION.md)** - How agents work
- **[Agent Resolution](./AGENT-RESOLUTION.md)** - Multi-source agents

### **Implementation**
- **[Implementation Guide](./IMPLEMENTATION-GUIDE.md)** - Integration with OpenCode
- **[Specification](./SPECIFICATION.md)** - Technical specification
- **[Implementation](./IMPLEMENTATION.md)** - Development roadmap

### **Progress Reports**
- **[Phase 1 Complete](./PHASE-1-COMPLETE.md)** - Foundation (66 tests)
- **[Phase 2 Complete](./PHASE-2-COMPLETE.md)** - Execution (87 tests)

---

## 🚀 **Quick Example**

### **Simple Sequential Workflow**

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

**What happens:**
1. Planner runs and creates a plan
2. Coder receives the plan automatically via context
3. Tester receives both plan and code via context

**No manual wiring needed!**

---

## 📊 **Current Status**

### **Phase 1: Foundation** ✅ Complete
- ✅ Type definitions
- ✅ Immutable context management
- ✅ Zod validation schemas
- ✅ Workflow validator
- ✅ 66 tests passing

### **Phase 2: Basic Execution** ✅ Complete
- ✅ Base executor interface
- ✅ Agent step executor (with retry logic)
- ✅ Transform & condition executors
- ✅ Workflow executor (orchestration)
- ✅ Multi-source agent resolution
- ✅ 87 tests passing

### **Phase 3: Advanced Features** ⏳ Next
- ⏳ Parallel execution
- ⏳ Approval steps
- ⏳ Workflow persistence
- ⏳ Enhanced logging

**See [Implementation Guide](./IMPLEMENTATION.md) for full roadmap.**

---

## 🎨 **Workflow Features**

### **1. Automatic Context Passing**
Every step automatically receives results from previous steps:

```typescript
// Step 1: Plan
// Returns: { files: ["a.ts", "b.ts"], approach: "..." }

// Step 2: Code
// Receives:
{
  input: "Build feature X",
  context: {
    plan: { files: ["a.ts", "b.ts"], approach: "..." }  // ← Automatic!
  }
}
```

### **2. Parallel Execution**
Run multiple steps concurrently:

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

### **3. Approval Gates**
Human-in-the-loop decision points:

```json
{
  "id": "approve",
  "type": "approval",
  "message": "Deploy to production?",
  "on_approve": "deploy",
  "on_reject": "cancel"
}
```

### **4. Conditional Branching**
Route based on results:

```json
{
  "id": "check",
  "type": "condition",
  "condition": "context.test.success === true",
  "then": "deploy",
  "else": "notify"
}
```

### **5. Safety Guards**
Prevent common issues:
- **Iteration Guard** - Prevents infinite loops (max_iterations: 100)
- **Duration Guard** - Prevents runaway workflows (max_duration_ms: 300000)
- **Error Guard** - Prevents error cascades (max_errors: 10)

---

## 📖 **Learn More**

### **Technical Details**
- [Specification](./SPECIFICATION.md) - Complete technical spec
- [Implementation Guide](./IMPLEMENTATION.md) - Development roadmap

### **Current Progress**
- [Phase 1 Complete](./PHASE-1-COMPLETE.md) - Foundation complete

### **Source Code**
- `src/workflow/` - Workflow system implementation
- `src/workflow/types.ts` - Type definitions
- `src/workflow/context/` - Context management
- `src/workflow/validator.ts` - Workflow validation

---

## 🎯 **Design Principles**

1. **Simple** - One workflow = one JSON file
2. **Modular** - Each component has single responsibility
3. **Functional** - Pure functions, immutable data
4. **Safe** - Loop protection, timeouts, graceful failures
5. **Performant** - Parallel execution, minimal overhead

---

## 🚀 **Next Steps**

1. **Read the [Specification](./SPECIFICATION.md)** - Understand the design
2. **Review [Phase 1 Complete](./PHASE-1-COMPLETE.md)** - See what's built
3. **Check [Implementation Guide](./IMPLEMENTATION.md)** - See the roadmap

---

## 📝 **Status**

**Current Phase**: Phase 1 Complete ✅  
**Next Phase**: Phase 2 - Basic Execution  
**Estimated Completion**: 5 phases remaining (~35 hours)

---

**Questions? See the [Specification](./SPECIFICATION.md) or check the source code in `src/workflow/`**

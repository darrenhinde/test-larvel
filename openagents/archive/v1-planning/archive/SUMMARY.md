# OpenAgents Multi-Agent System - Executive Summary

**Date**: Thu Dec 18 2025  
**Status**: ✅ Planning Complete - Ready for Review

---

## 🎯 What We're Building

A **modular, functional multi-agent management system** for OpenCode that enables:

- ✅ **Parallel agent execution** (10+ agents simultaneously)
- ✅ **Context sharing** between agents (file-based)
- ✅ **Cost control** (per-agent, per-workflow, daily limits)
- ✅ **Smart chunking** (handles 3k prompt limit)
- ✅ **Free model support** (opencode/big-pickle, opencode/grok-fast)
- ✅ **Clear UX** (toasts, progress, cost visibility)

---

## 📐 Core Design Principles

### **1. Functional Programming**
```typescript
// Pure functions - easy to understand and test
const calculateCost = (tokens: number, price: number): number =>
  tokens * price

// Immutable updates - no hidden state changes
const updateTask = (task: Task, status: Status): Task =>
  ({ ...task, status })

// Composition - build complex from simple
const processText = (text: string): string[] =>
  pipe(text, sanitize, chunk, addHeaders)
```

### **2. Modular Architecture**
```
Task Manager    → Track agent execution
Context Manager → Share data between agents
Cost Manager    → Track and limit costs
UI Manager      → Show toasts and progress
Chunker         → Handle 3k limit
```

### **3. Explicit Configuration**
```json
{
  "default_model": "opencode/big-pickle",
  "cost_limits": { "per_agent": 0.10 },
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true,
      "parallel_limit": 10
    }
  }
}
```

---

## 🚀 Implementation Plan

### **Phase 1: Foundation** (Week 1)
- Task manager for tracking agents
- Toast notifications
- Free model support
- Basic parallel execution

### **Phase 2: Context & Chunking** (Week 2)
- Context manager (file-based)
- Smart chunking (3k limit)
- Context sharing between agents

### **Phase 3: Cost Control** (Week 3)
- Cost tracking per agent
- Cost limits and warnings
- Cost summaries

### **Phase 4: Polish** (Week 4)
- Comprehensive tests
- Documentation
- Examples

---

## 📊 Key Features

### **1. Parallel Execution**
```typescript
// Launch 3 researchers in parallel
const tasks = await Promise.all([
  launchAgent({ agent: "researcher-1", ... }),
  launchAgent({ agent: "researcher-2", ... }),
  launchAgent({ agent: "researcher-3", ... })
])

// User sees: "🚀 Starting 3 research agents..."
// Then: "✅ researcher-1 completed (8s)"
//       "✅ researcher-2 completed (12s)"
//       "✅ researcher-3 completed (15s)"
```

### **2. Context Sharing**
```typescript
// Agent 1 saves context
await saveContext({
  id: "research-results",
  data: { findings: [...] }
})

// Agent 2 loads context
const context = await loadContext("research-results")
// Uses findings from Agent 1
```

### **3. Cost Control**
```typescript
// Check before launching
const cost = estimateCost(task)
if (cost > limits.perAgent) {
  throw new Error("Cost limit exceeded")
}

// Track after completion
trackCost(task.id, actualCost)

// Show summary
// "Total: $0.15 (3 agents)"
```

### **4. Smart Chunking**
```typescript
// Large response (5000 chars)
const response = "..."

// Chunk intelligently
const chunks = chunkText(response, 3000)
// ["[Part 1/2]\n\n...", "[Part 2/2]\n\n..."]

// Send chunks
await sendChunkedContent(sessionID, chunks, client)
```

---

## 🎨 User Experience

### **Scenario: Complex Research Task**

```
1. User: "Research authentication best practices"

2. Primary Agent decides to use parallel research

3. OpenAgents launches 3 researchers:
   Toast: "🚀 Starting 3 research agents..."

4. Progress updates:
   Toast: "✅ researcher-1 completed (8s)"
   Toast: "✅ researcher-2 completed (12s)"
   Toast: "✅ researcher-3 completed (15s)"

5. Context saved:
   .openagents/context/auth-research.json

6. Primary Agent receives notification:
   "All research completed. 3 agents finished in 15s."

7. Summary:
   Toast: "✅ Research complete! 3 agents, 15s, $0.08"
```

---

## 🧪 Testing Approach

### **Pure Functions** (Easy)
```typescript
describe("chunkText", () => {
  it("splits on paragraph boundaries", () => {
    const text = "Para 1\n\nPara 2"
    const result = chunkText(text, 10)
    expect(result.length).toBeGreaterThan(1)
  })
})
```

### **Impure Functions** (Mock)
```typescript
describe("launchAgent", () => {
  it("creates session", async () => {
    const mockClient = {
      session: { create: vi.fn().mockResolvedValue({ data: { id: "123" } }) }
    }
    const result = await launchAgent(input, mockClient)
    expect(result.ok).toBe(true)
  })
})
```

---

## 📁 File Structure

```
openagents/
├── src/
│   ├── features/
│   │   ├── task-manager/      # Track agents
│   │   ├── context-manager/   # Share context
│   │   ├── cost-manager/      # Track costs
│   │   └── ui-manager/        # Show toasts
│   ├── utils/
│   │   └── chunker.ts         # Handle 3k limit
│   ├── config/
│   │   └── schema.ts          # Config validation
│   └── plugin/
│       └── index.ts           # Plugin entry
├── plan/                      # Planning docs
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-config-schema.md
│   ├── 05-chunking.md
│   └── 06-functional.md
└── test/                      # Tests
```

---

## 🎯 Success Criteria

### **Technical**
- ✅ Handles 10+ parallel agents
- ✅ No memory leaks
- ✅ Proper error recovery
- ✅ 80%+ test coverage

### **User Experience**
- ✅ Clear visibility (toasts)
- ✅ Understandable errors
- ✅ Predictable costs
- ✅ Easy configuration

### **Code Quality**
- ✅ Functional patterns
- ✅ Small, focused functions
- ✅ Clear types
- ✅ Easy to maintain

---

## 🔍 Key Constraints

1. **3k Prompt Limit** → Smart chunking on natural boundaries
2. **Free Models** → opencode/big-pickle, opencode/grok-fast
3. **No Database** → File-based context storage
4. **Manual Parallel** → User controls when to parallelize
5. **Explicit Config** → No magic, everything configurable

---

## 📚 Documentation

All planning documents in `plan/`:

- **00-overview.md** - Project overview
- **01-architecture.md** - Technical architecture
- **02-config-schema.md** - Configuration design
- **05-chunking.md** - 3k limit handling
- **06-functional.md** - Functional patterns
- **README.md** - Document index

---

## ✅ Next Steps

1. **Review Planning** - Read documents, provide feedback
2. **Approve Approach** - Sign off on architecture
3. **Start Phase 1** - Begin implementation
4. **Iterate** - Refine based on learnings

---

## 💡 Why This Approach?

### **Functional Programming**
- Easier to understand (clear input/output)
- Easier to test (pure functions)
- Easier to maintain (no hidden state)

### **Modular Design**
- Small, focused modules
- Clear responsibilities
- Easy to extend

### **Free Models**
- No cost during development
- Fast iteration
- Easy testing

### **File-Based Context**
- Simple and debuggable
- Survives crashes
- No database needed

---

**Status**: ✅ Ready for Review and Implementation

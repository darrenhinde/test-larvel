# OpenAgents Planning Documents

**Last Updated**: Thu Dec 18 2025  
**Status**: Planning Complete - Ready for Review

---

## 📚 Document Index

### **Core Planning Documents**

1. **[00-overview.md](./00-overview.md)** - Project overview and goals
   - Architecture principles
   - Project structure
   - Implementation phases
   - Success metrics

2. **[01-architecture.md](./01-architecture.md)** - Detailed architecture design
   - Functional programming principles
   - Module responsibilities
   - Data flow examples
   - Testing strategy

3. **[02-config-schema.md](./02-config-schema.md)** - Configuration design
   - Complete schema definition
   - Example configurations
   - Validation approach
   - Configuration helpers

4. **[05-chunking.md](./05-chunking.md)** - 3k limit handling
   - Chunking strategy
   - Pure function design
   - Testing approach
   - Best practices

5. **[06-functional.md](./06-functional.md)** - Functional programming patterns
   - Core principles
   - Common patterns
   - Architectural patterns
   - Real-world examples

---

## 🎯 Quick Start

### **For Reviewers**:
1. Start with [00-overview.md](./00-overview.md) for big picture
2. Read [01-architecture.md](./01-architecture.md) for technical details
3. Review [02-config-schema.md](./02-config-schema.md) for configuration
4. Check [06-functional.md](./06-functional.md) for code patterns

### **For Implementers**:
1. Understand architecture from [01-architecture.md](./01-architecture.md)
2. Study functional patterns in [06-functional.md](./06-functional.md)
3. Reference config schema in [02-config-schema.md](./02-config-schema.md)
4. Follow chunking guide in [05-chunking.md](./05-chunking.md)

---

## 🏗️ Key Design Decisions

### **1. Free Models for Testing**
- **Primary**: `opencode/big-pickle` (more capable)
- **Fast**: `opencode/grok-fast` (parallel tasks)
- **Rationale**: No cost during development/testing

### **2. Functional Programming**
- **Pure functions** for business logic
- **Immutable data** structures
- **Explicit dependencies** via parameters
- **Rationale**: Easier to understand, test, and maintain

### **3. File-Based Context**
- **Storage**: `.openagents/context/*.json`
- **TTL**: 1 hour default
- **Auto-cleanup**: Enabled by default
- **Rationale**: Simple, debuggable, persistent

### **4. 3k Prompt Limit**
- **Strategy**: Smart chunking on natural boundaries
- **Headers**: `[Part 1/3]` for multi-part messages
- **Fallback**: Hard split if needed
- **Rationale**: Preserve meaning while respecting limits

### **5. Cost Controls**
- **Per-agent**: $0.10 default
- **Per-workflow**: $1.00 default
- **Daily**: $10.00 default
- **Rationale**: Prevent runaway costs

### **6. Agent Discovery**
- **Mode**: Explicit by default
- **Config**: Per-agent `can_discover` lists
- **Rationale**: Security and control

---

## 📊 Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                  OpenAgents Plugin                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Agent Loader │  │Config Manager│  │Task Manager  │  │
│  │  - Parse .md │  │ - Load/merge │  │ - Track jobs │  │
│  │  - Register  │  │ - Validate   │  │ - Notify     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Context Mgr   │  │  Cost Mgr    │  │  UI Manager  │  │
│  │ - File store │  │ - Track cost │  │ - Toasts     │  │
│  │ - Share data │  │ - Enforce    │  │ - Progress   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### **Phase 1: Foundation** (Week 1)
**Goal**: Basic multi-agent execution with free models

**Deliverables**:
- Enhanced config schema
- Task manager
- Toast notifications
- Free model support
- Parallel execution

**Files to Create**:
- `src/features/task-manager/`
- `src/features/ui-manager/`
- `src/config/schema.ts` (enhanced)
- `src/tools/multi-agent/`

### **Phase 2: Context & Chunking** (Week 2)
**Goal**: Context sharing with 3k limit handling

**Deliverables**:
- Context manager
- Chunking utility
- Context sharing
- Context cleanup

**Files to Create**:
- `src/features/context-manager/`
- `src/utils/chunker.ts`

### **Phase 3: Cost Control** (Week 3)
**Goal**: Cost tracking and limits

**Deliverables**:
- Cost tracker
- Cost limiter
- Cost summaries
- Warnings

**Files to Create**:
- `src/features/cost-manager/`

### **Phase 4: Polish** (Week 4)
**Goal**: Production-ready

**Deliverables**:
- Comprehensive tests
- Documentation
- Examples
- Error handling

---

## 🧪 Testing Strategy

### **Pure Functions** (Easy)
```typescript
describe("chunkText", () => {
  it("returns single chunk for small text", () => {
    expect(chunkText("Hello", 3000)).toEqual(["Hello"])
  })
})
```

### **Impure Functions** (Mock Dependencies)
```typescript
describe("launchAgent", () => {
  it("creates session", async () => {
    const mockClient = { session: { create: vi.fn() } }
    // ...
  })
})
```

---

## 📝 Configuration Examples

### **Minimal (Defaults)**
```json
{
  "agents_dir": "./agents"
}
```

### **Free Models Testing**
```json
{
  "default_model": "opencode/big-pickle",
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true
    }
  }
}
```

### **Production**
```json
{
  "default_model": "anthropic/claude-haiku-4",
  "cost_limits": {
    "per_agent": 0.05,
    "daily": 5.00
  },
  "agents": {
    "researcher": {
      "parallel": true,
      "parallel_limit": 10
    }
  }
}
```

---

## 🎯 Success Criteria

### **Technical**
- ✅ All tests passing
- ✅ No memory leaks
- ✅ Handles 10+ parallel agents
- ✅ Proper error recovery

### **User Experience**
- ✅ Clear visibility
- ✅ Understandable errors
- ✅ Predictable costs
- ✅ Easy configuration

### **Code Quality**
- ✅ Functional patterns
- ✅ Small functions
- ✅ Clear types
- ✅ Easy to maintain

---

## 🔄 Next Steps

1. **Review Planning** - Get feedback on design
2. **Approve Approach** - Sign off on architecture
3. **Start Phase 1** - Begin implementation
4. **Iterate** - Refine based on learnings

---

## 📞 Questions?

If you have questions about any design decision:

1. Check the relevant planning document
2. Look for "Rationale" sections
3. Review examples
4. Ask for clarification

---

## 🎨 Design Philosophy

### **Keep It Simple**
- Start with basics
- Add complexity only when needed
- Prefer explicit over clever

### **Keep It Functional**
- Pure functions for logic
- Immutable data
- Clear dependencies

### **Keep It Modular**
- Small, focused modules
- Clear interfaces
- Easy to test

### **Keep It Maintainable**
- Clear naming
- Good documentation
- Consistent patterns

---

**Status**: ✅ Planning Complete - Ready for Implementation

# OpenAgents Multi-Agent System - Plan Overview

**Last Updated**: Thu Dec 18 2025  
**Status**: Planning Phase

---

## 🎯 Project Goals

Build a **modular, maintainable multi-agent management system** for OpenCode that:

1. **Enables parallel agent execution** with clear visibility
2. **Manages context sharing** between agents efficiently
3. **Provides cost control** and limits per agent
4. **Uses functional programming** principles for clarity
5. **Handles OpenCode constraints** (3k prompt limit, chunking)
6. **Supports free models** for testing (opencode/big-pickle, opencode/grok-fast)

---

## 🏗️ Architecture Principles

### **1. Functional Programming First**
- Pure functions where possible
- Immutable data structures
- Composition over inheritance
- Clear input/output contracts
- No hidden side effects

### **2. Modular Design**
- Small, focused modules
- Clear separation of concerns
- Easy to test in isolation
- Easy to understand and maintain

### **3. Explicit Over Implicit**
- Configuration over convention
- Clear error messages
- Visible state changes
- No magic behavior

### **4. Practical Constraints**
- 3k prompt limit (chunk larger responses)
- Free models for testing
- File-based context (no database initially)
- Manual parallel execution (user control)

---

## 📁 Project Structure

```
openagents/
├── src/
│   ├── agents/              # Agent loading & parsing
│   │   ├── loader.ts
│   │   ├── parser.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── config/              # Configuration management
│   │   ├── schema.ts
│   │   ├── loader.ts
│   │   ├── validator.ts
│   │   └── index.ts
│   │
│   ├── features/            # Core features
│   │   ├── task-manager/    # Multi-agent task management
│   │   │   ├── types.ts
│   │   │   ├── manager.ts
│   │   │   ├── tracker.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── context-manager/ # Context sharing & persistence
│   │   │   ├── types.ts
│   │   │   ├── manager.ts
│   │   │   ├── storage.ts
│   │   │   ├── chunker.ts   # Handle 3k limit
│   │   │   └── index.ts
│   │   │
│   │   ├── cost-manager/    # Cost tracking & limits
│   │   │   ├── types.ts
│   │   │   ├── tracker.ts
│   │   │   ├── limiter.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ui-manager/      # Toasts & notifications
│   │   │   ├── types.ts
│   │   │   ├── manager.ts
│   │   │   └── index.ts
│   │   │
│   │   └── mcp-manager/     # MCP configuration
│   │       ├── types.ts
│   │       ├── manager.ts
│   │       └── index.ts
│   │
│   ├── tools/               # Custom tools
│   │   ├── multi-agent/     # Multi-agent execution tool
│   │   │   ├── tool.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── agent-status/    # Check agent status tool
│   │       ├── tool.ts
│   │       └── index.ts
│   │
│   ├── utils/               # Shared utilities
│   │   ├── chunker.ts       # Chunk large text
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   └── index.ts
│   │
│   ├── plugin/              # Plugin entry point
│   │   └── index.ts
│   │
│   └── index.ts             # Main export
│
├── plan/                    # Planning documents
│   ├── 00-overview.md       # This file
│   ├── 01-architecture.md   # Detailed architecture
│   ├── 02-config-schema.md  # Configuration design
│   ├── 03-context-system.md # Context management
│   ├── 04-cost-system.md    # Cost tracking & limits
│   ├── 05-chunking.md       # 3k limit handling
│   ├── 06-functional.md     # Functional patterns
│   └── 07-implementation.md # Implementation phases
│
├── test/                    # Tests
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── .openagents/             # Example configuration
    ├── agents/
    ├── context/
    └── config.json
```

---

## 🎨 Design Decisions

### **1. Free Models for Testing**
```json
{
  "default_model": "opencode/big-pickle",
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast"  // Fast, free
    },
    "coder": {
      "model": "opencode/big-pickle"  // More capable, free
    }
  }
}
```

### **2. Cost Limits Per Agent**
```json
{
  "cost_limits": {
    "per_agent": 0.10,      // Max $0.10 per agent invocation
    "per_workflow": 1.00,   // Max $1.00 per workflow
    "daily": 10.00          // Max $10.00 per day
  }
}
```

### **3. Chunking for 3k Limit**
```typescript
// Functional approach
const chunkText = (text: string, maxSize: number = 3000): string[] => {
  if (text.length <= maxSize) return [text]
  
  // Split on natural boundaries (paragraphs, sentences)
  return splitOnBoundaries(text, maxSize)
}

const sendChunked = async (
  sessionID: string,
  text: string,
  client: Client
): Promise<void> => {
  const chunks = chunkText(text)
  
  for (const [index, chunk] of chunks.entries()) {
    const prefix = chunks.length > 1 
      ? `[Part ${index + 1}/${chunks.length}]\n\n`
      : ""
    
    await client.session.prompt({
      path: { id: sessionID },
      body: { parts: [{ type: "text", text: prefix + chunk }] }
    })
  }
}
```

### **4. Agent Discovery (Controlled)**
```json
{
  "agent_discovery": {
    "enabled": true,
    "mode": "explicit",  // "explicit" | "automatic" | "disabled"
    "allowed_agents": ["researcher", "coder", "reviewer"]
  },
  "agents": {
    "planner": {
      "can_discover": ["researcher", "coder"],  // Only these
      "can_be_discovered": true  // Others can find this agent
    }
  }
}
```

### **5. Error Communication**
```typescript
// Functional error handling
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E }

const launchAgent = async (
  input: LaunchInput
): Promise<Result<AgentTask>> => {
  try {
    const task = await createTask(input)
    return { ok: true, value: task }
  } catch (error) {
    return { 
      ok: false, 
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

// Usage
const result = await launchAgent(input)
if (!result.ok) {
  // Communicate error back to parent agent
  await notifyError(result.error)
  return
}

const task = result.value
```

---

## 🚀 Implementation Phases

### **Phase 1: Foundation** (Week 1)
**Goal**: Basic multi-agent execution with free models

**Deliverables**:
- [ ] Enhanced config schema with cost limits
- [ ] Task manager for tracking agents
- [ ] Basic toast notifications
- [ ] Free model support (big-pickle, grok-fast)
- [ ] Simple parallel execution

**Success Criteria**:
- Can launch 3 agents in parallel
- Toasts show start/complete
- Uses free models
- No crashes

### **Phase 2: Context & Chunking** (Week 2)
**Goal**: Context sharing with 3k limit handling

**Deliverables**:
- [ ] Context manager with file storage
- [ ] Chunking utility for large responses
- [ ] Context sharing between agents
- [ ] Context cleanup

**Success Criteria**:
- Agents can share context via files
- Large responses chunked properly
- No 3k limit errors
- Context persists between runs

### **Phase 3: Cost Control** (Week 3)
**Goal**: Cost tracking and limits

**Deliverables**:
- [ ] Cost tracker per agent
- [ ] Cost limiter with warnings
- [ ] Cost summary in toasts
- [ ] Daily/workflow limits

**Success Criteria**:
- Accurate cost tracking
- Limits enforced
- Clear cost visibility
- Warnings before limits

### **Phase 4: Polish & Testing** (Week 4)
**Goal**: Production-ready system

**Deliverables**:
- [ ] Comprehensive tests
- [ ] Documentation
- [ ] Example workflows
- [ ] Error handling improvements

**Success Criteria**:
- 80%+ test coverage
- Clear documentation
- Working examples
- Stable in production

---

## 📊 Success Metrics

### **Technical Metrics**
- ✅ All tests passing
- ✅ No memory leaks
- ✅ < 100ms overhead per agent launch
- ✅ Handles 10+ parallel agents
- ✅ Proper error recovery

### **User Experience Metrics**
- ✅ Clear visibility into agent status
- ✅ Understandable error messages
- ✅ Predictable cost behavior
- ✅ Easy configuration
- ✅ Good documentation

### **Code Quality Metrics**
- ✅ Functional programming patterns
- ✅ Small, focused functions
- ✅ Clear type definitions
- ✅ Minimal side effects
- ✅ Easy to maintain

---

## 🎯 Next Steps

1. **Review this overview** - Ensure alignment on goals
2. **Read detailed plans** - Review architecture, config, etc.
3. **Approve approach** - Get sign-off before implementation
4. **Start Phase 1** - Begin with foundation

---

## 📚 Related Documents

- [01-architecture.md](./01-architecture.md) - Detailed architecture design
- [02-config-schema.md](./02-config-schema.md) - Configuration schema
- [03-context-system.md](./03-context-system.md) - Context management
- [04-cost-system.md](./04-cost-system.md) - Cost tracking & limits
- [05-chunking.md](./05-chunking.md) - 3k limit handling
- [06-functional.md](./06-functional.md) - Functional programming patterns
- [07-implementation.md](./07-implementation.md) - Implementation guide

---

**Status**: Ready for review

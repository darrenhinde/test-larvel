# OpenAgents v1 - Simplified Plan

**Last Updated**: Thu Dec 18 2025  
**Status**: Ready for Implementation  
**Philosophy**: Build the simplest thing that works, then iterate

---

## 🎯 What We're Building (v1 Only)

A **minimal, functional multi-agent plugin** that does ONE thing well:

**Enable parallel agent execution with basic context sharing and progress visibility.**

That's it. No over-engineering.

---

## ✅ Core Features (v1)

1. **Load agents from `.md` files** (already works)
2. **Track running tasks** (simple Map)
3. **Show toast notifications** (start/complete/error)
4. **Share context via JSON files** (read/write)
5. **Support parallel execution** (via background_task)
6. **Use free models** (opencode/big-pickle, opencode/grok-fast)

---

## ❌ What We're NOT Building (v1)

- ❌ Cost tracking (free models don't need it)
- ❌ MCP manager (OpenCode handles this)
- ❌ Complex validation (Zod schema is enough)
- ❌ TTL/cleanup (manual cleanup is fine)
- ❌ Agent discovery (just list in config)
- ❌ Workflow engine (too complex)
- ❌ Result<T,E> types (use try/catch)

**These can be added in v2+ if actually needed.**

---

## 📁 File Structure (v1)

```
openagents/
├── src/
│   ├── agents/              # Agent loading (already exists)
│   │   ├── loader.ts
│   │   ├── parser.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── config/              # Configuration (already exists)
│   │   ├── schema.ts        # Simple Zod schema
│   │   ├── loader.ts
│   │   └── index.ts
│   │
│   ├── features/            # Core features (NEW)
│   │   ├── task-tracker.ts  # Track running tasks (~50 lines)
│   │   ├── context.ts       # Read/write JSON files (~50 lines)
│   │   ├── ui.ts            # Toast notifications (~30 lines)
│   │   └── index.ts
│   │
│   ├── utils/               # Utilities (NEW)
│   │   ├── chunker.ts       # Chunk large text (~100 lines)
│   │   └── index.ts
│   │
│   ├── plugin/              # Plugin entry (UPDATE)
│   │   └── index.ts         # Main plugin logic (~100 lines)
│   │
│   └── index.ts             # Export
│
├── plan/                    # This directory
│   ├── README.md            # This file
│   ├── v1-implementation.md # Implementation guide
│   ├── v1-config.md         # Configuration
│   └── archive/             # Old over-engineered plans
│
└── test/                    # Tests
    └── ...
```

**Total new code**: ~300 lines

---

## 🏗️ Architecture (Simple)

```
┌─────────────────────────────────────────┐
│         OpenAgents Plugin               │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ Agent Loader │  │  Task Tracker   │ │
│  │ (existing)   │  │  - Map of tasks │ │
│  └──────────────┘  │  - Start/stop   │ │
│                    └─────────────────┘ │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │   Context    │  │   UI Manager    │ │
│  │ - Read JSON  │  │  - Show toasts  │ │
│  │ - Write JSON │  │  - Progress     │ │
│  └──────────────┘  └─────────────────┘ │
│                                         │
│  ┌──────────────┐                      │
│  │   Chunker    │                      │
│  │ - Split text │                      │
│  │ - 3k limit   │                      │
│  └──────────────┘                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📝 Configuration (Simple)

### **Minimal Config** (most users):
```json
{
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true
    }
  }
}
```

### **Full Config** (power users):
```json
{
  "agents_dir": "./agents",
  "default_model": "opencode/big-pickle",
  "context_dir": "./.openagents/context",
  
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true,
      "parallel_limit": 10,
      "temperature": 0.7
    },
    "coder": {
      "model": "opencode/big-pickle",
      "parallel": false,
      "temperature": 0.2
    }
  }
}
```

**That's it.** No complex nested objects, no 50 options.

---

## 🔧 Core Functions (Functional & Simple)

### **1. Task Tracker** (~50 lines)

```typescript
// Pure: Create task
const createTask = (agent: string, sessionID: string): Task => ({
  id: generateId(),
  agent,
  sessionID,
  status: "running",
  startedAt: new Date()
})

// Pure: Update task
const updateTask = (task: Task, status: TaskStatus): Task => ({
  ...task,
  status,
  completedAt: status === "completed" ? new Date() : undefined
})

// Impure: Task tracker (simple Map)
export const createTaskTracker = () => {
  const tasks = new Map<string, Task>()
  
  return {
    start: (agent: string, sessionID: string) => {
      const task = createTask(agent, sessionID)
      tasks.set(task.id, task)
      return task
    },
    
    complete: (sessionID: string) => {
      const task = findBySession(tasks, sessionID)
      if (task) {
        tasks.set(task.id, updateTask(task, "completed"))
      }
    },
    
    getTasks: () => Array.from(tasks.values())
  }
}
```

### **2. Context Manager** (~50 lines)

```typescript
// Pure: Create context
const createContext = (name: string, data: any): Context => ({
  id: name,
  createdAt: new Date().toISOString(),
  data
})

// Impure: Read/write JSON
export const createContextManager = (baseDir: string) => {
  const contextDir = join(baseDir, ".openagents", "context")
  
  return {
    save: async (name: string, data: any) => {
      await mkdir(contextDir, { recursive: true })
      const context = createContext(name, data)
      await writeFile(
        join(contextDir, `${name}.json`),
        JSON.stringify(context, null, 2)
      )
    },
    
    load: async (name: string) => {
      const path = join(contextDir, `${name}.json`)
      if (!existsSync(path)) return null
      
      const content = await readFile(path, "utf-8")
      return JSON.parse(content)
    }
  }
}
```

### **3. UI Manager** (~30 lines)

```typescript
// Impure: Show toasts
export const createUIManager = (client: Client) => ({
  showStart: async (agent: string) => {
    await client.tui.showToast({
      body: {
        title: "Agent Started",
        message: `🚀 ${agent}`,
        variant: "info"
      }
    }).catch(() => {})
  },
  
  showComplete: async (agent: string, duration: string) => {
    await client.tui.showToast({
      body: {
        title: "Agent Completed",
        message: `✅ ${agent} (${duration})`,
        variant: "success"
      }
    }).catch(() => {})
  },
  
  showError: async (agent: string, error: string) => {
    await client.tui.showToast({
      body: {
        title: "Agent Failed",
        message: `❌ ${agent}: ${error}`,
        variant: "error"
      }
    }).catch(() => {})
  }
})
```

### **4. Chunker** (~100 lines)

```typescript
// Pure: Chunk text
export const chunkText = (text: string, maxSize = 3000): string[] => {
  if (text.length <= maxSize) return [text]
  
  // Split on paragraphs
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ""
  
  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= maxSize) {
      current += (current ? "\n\n" : "") + para
    } else {
      if (current) chunks.push(current)
      current = para.length > maxSize 
        ? para.slice(0, maxSize)  // Hard split if needed
        : para
    }
  }
  
  if (current) chunks.push(current)
  return chunks
}

// Pure: Add headers
export const addHeaders = (chunks: string[]): string[] =>
  chunks.length === 1
    ? chunks
    : chunks.map((c, i) => `[Part ${i + 1}/${chunks.length}]\n\n${c}`)
```

---

## 🚀 Implementation Steps

### **Step 1: Update Config Schema** (30 min)
- Simplify to just what we need
- Remove cost_limits, mcp, agent_discovery, etc.
- Keep: agents_dir, default_model, agents config

### **Step 2: Create Task Tracker** (1 hour)
- Simple Map-based tracker
- Start/complete/error methods
- Pure functions for task creation/updates

### **Step 3: Create Context Manager** (1 hour)
- Read/write JSON files
- Create directory if needed
- Handle missing files gracefully

### **Step 4: Create UI Manager** (30 min)
- Toast helpers
- Start/complete/error notifications
- Handle toast failures gracefully

### **Step 5: Create Chunker** (1 hour)
- Split on paragraph boundaries
- Add headers for multi-part
- Test with large text

### **Step 6: Update Plugin Entry** (2 hours)
- Wire everything together
- Handle events (session.created, session.idle)
- Register agents

### **Step 7: Test** (2 hours)
- Test parallel execution
- Test context sharing
- Test toasts
- Test chunking

**Total**: ~8 hours of focused work

---

## 🧪 Testing Strategy

### **Manual Testing** (v1)
```bash
# 1. Load plugin
opencode --print-logs

# 2. Launch agents in parallel
# (via primary agent using background_task)

# 3. Verify:
# - Toasts show up
# - Context files created
# - Agents complete
# - No crashes
```

### **Unit Tests** (v2+)
- Test pure functions (easy)
- Mock dependencies for impure functions

---

## 📊 Success Criteria (v1)

### **Must Have**:
- ✅ Can load agents from .md files
- ✅ Can track 3+ parallel agents
- ✅ Shows toast on start/complete
- ✅ Can save/load context JSON
- ✅ Handles text >3k chars
- ✅ No crashes

### **Nice to Have** (v2+):
- Cost tracking
- Better error handling
- Comprehensive tests
- Documentation

---

## 🎯 What Success Looks Like

```
User: "Research authentication patterns"

Primary Agent: Launches 3 researchers in parallel

OpenAgents:
├─> Toast: "🚀 researcher-1"
├─> Toast: "🚀 researcher-2"
├─> Toast: "🚀 researcher-3"
│
├─> researcher-1 saves: .openagents/context/auth-jwt.json
├─> researcher-2 saves: .openagents/context/auth-oauth.json
├─> researcher-3 saves: .openagents/context/auth-security.json
│
├─> Toast: "✅ researcher-1 (8s)"
├─> Toast: "✅ researcher-2 (12s)"
└─> Toast: "✅ researcher-3 (15s)"

Primary Agent: Loads all 3 context files, synthesizes results
```

**That's it. Simple, functional, works.**

---

## 📚 Related Documents

- [v1-implementation.md](./v1-implementation.md) - Detailed implementation guide
- [v1-config.md](./v1-config.md) - Configuration reference
- [archive/](./archive/) - Old over-engineered plans (for reference)

---

## 💡 Philosophy

### **Keep It Simple**
- Build the minimum that works
- Add features only when needed
- Don't solve hypothetical problems

### **Keep It Functional**
- Pure functions for logic
- Immutable data
- Clear dependencies

### **Keep It Modular**
- Small files (~50-100 lines)
- Clear responsibilities
- Easy to understand

### **Keep It Practical**
- Test with real usage
- Iterate based on feedback
- Don't over-engineer

---

**Status**: ✅ Ready to implement - Let's build this!

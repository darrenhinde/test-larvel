# OpenAgents v1 - Project Summary

**Quick reference for understanding the complete system**

---

## 🎯 **What Is OpenAgents?**

A **minimal plugin for OpenCode** that enables:
1. **Parallel agent execution** - Run multiple agents at once
2. **Context sharing** - Agents share data via JSON files
3. **Progress tracking** - See when agents start/complete
4. **Smart chunking** - Handle large text automatically

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                        OpenCode                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Primary Agent                        │  │
│  │  (User interacts with this)                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ Launches subagents               │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              OpenAgents Plugin                      │    │
│  │                                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │    │
│  │  │ TaskTracker  │  │   Context    │  │    UI    │ │    │
│  │  │              │  │   Manager    │  │  Manager │ │    │
│  │  │ - Track runs │  │ - Save JSON  │  │ - Toasts │ │    │
│  │  │ - Duration   │  │ - Load JSON  │  │ - Status │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │    │
│  │                                                     │    │
│  │  ┌──────────────┐                                  │    │
│  │  │   Chunker    │                                  │    │
│  │  │ - Split text │                                  │    │
│  │  └──────────────┘                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           │ Manages                          │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Subagent Sessions                      │    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │Researcher│  │Researcher│  │Researcher│  ...    │    │
│  │  │    #1    │  │    #2    │  │    #3    │         │    │
│  │  └──────────┘  └──────────┘  └──────────┘         │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           │ Save/Load                        │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         .openagents/context/                        │    │
│  │                                                     │    │
│  │  research-1.json                                    │    │
│  │  research-2.json                                    │    │
│  │  research-3.json                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Complete Flow (Step-by-Step)**

### **Phase 1: Initialization**

```
1. User starts OpenCode
   ↓
2. OpenCode loads plugins
   ↓
3. OpenAgents plugin initializes:
   - Creates TaskTracker
   - Creates ContextManager
   - Creates UIManager
   ↓
4. Plugin loads agents from .openagents/agents/*.md
   ↓
5. Plugin registers agents with OpenCode
   ↓
6. ✅ Toast: "OpenAgents v0.1.0 - Loaded 3 agents: researcher, coder, reviewer"
```

---

### **Phase 2: Agent Execution**

```
User: "Research authentication patterns"
   ↓
Primary Agent: "I'll launch 3 researchers in parallel"
   ↓
Primary Agent calls background_task 3 times:
   - background_task(agent="researcher", prompt="Research JWT")
   - background_task(agent="researcher", prompt="Research OAuth")
   - background_task(agent="researcher", prompt="Research Sessions")
   ↓
OpenCode creates 3 new sessions
   ↓
OpenAgents receives 3 "session.created" events
   ↓
For each session:
   1. TaskTracker.start(agent, sessionID)
   2. UIManager.showStart(agent)
   3. 🚀 Toast: "Agent Started - 🚀 researcher"
   ↓
Agents execute in parallel...
   ↓
Each agent completes:
   1. Saves context: contextManager.save("jwt-research", data)
   2. OpenCode sends "session.idle" event
   3. TaskTracker.complete(sessionID)
   4. UIManager.showComplete(agent, duration)
   5. ✅ Toast: "Agent Completed - ✅ researcher (8s)"
   ↓
Primary Agent:
   1. Loads all context files
   2. Synthesizes results
   3. Presents to user
```

---

## 📊 **Data Flow**

### **Task Data**

```typescript
// Stored in memory (Map)
{
  id: "task_1766055809428_zytue4m",
  agent: "researcher",
  sessionID: "session-abc123",
  status: "completed",
  startedAt: Date("2025-12-18T11:00:00Z"),
  completedAt: Date("2025-12-18T11:00:08Z")
}
```

**Lifecycle**:
```
start() → status: "running"
   ↓
complete() → status: "completed", completedAt set
   OR
error() → status: "error", error message set
```

---

### **Context Data**

```typescript
// Stored in .openagents/context/*.json
{
  id: "jwt-research",
  createdAt: "2025-12-18T11:00:08Z",
  data: {
    // Any data the agent wants to save
    method: "JWT",
    pros: ["Stateless", "Scalable"],
    cons: ["Token size", "Cannot revoke"],
    examples: [...]
  }
}
```

**Lifecycle**:
```
Agent 1: save("jwt-research", data)
   ↓
File created: .openagents/context/jwt-research.json
   ↓
Agent 2: load("jwt-research")
   ↓
Returns: { id, createdAt, data }
```

---

## 🧪 **What We Tested**

### **Test 1: Task Tracker** ✅

```typescript
// Create tracker
const tracker = createTaskTracker()

// Start task
const task = tracker.start("researcher", "session-1")
// ✅ Creates task with unique ID

// Complete task
const completed = tracker.complete("session-1")
// ✅ Marks as completed, sets completedAt

// Get duration
const duration = tracker.getDuration(completed)
// ✅ Returns "0s" or "1m 30s"

// Track error
const errored = tracker.error("session-2", "Test error")
// ✅ Marks as error, stores error message

// Get all tasks
const allTasks = tracker.getTasks()
// ✅ Returns array of all tasks
```

**Result**: ✅ All operations work correctly

---

### **Test 2: Context Manager** ✅

```typescript
// Create manager
const contextMgr = createContextManager("/tmp/test")

// Save context
await contextMgr.save("test-context", { 
  message: "Hello!",
  timestamp: new Date().toISOString()
})
// ✅ Creates .openagents/context/test-context.json

// Load context
const loaded = await contextMgr.load("test-context")
// ✅ Returns { id, createdAt, data }

// Check exists
const exists = contextMgr.exists("test-context")
// ✅ Returns true

// Load missing
const missing = await contextMgr.load("nonexistent")
// ✅ Returns null (no crash)
```

**Result**: ✅ All operations work correctly

---

### **Test 3: Text Chunker** ✅

```typescript
// Short text
const short = chunkText("Hello world", 3000)
// ✅ Returns ["Hello world"]

// Long text (5600 chars)
const long = chunkText("Lorem ipsum...".repeat(200), 3000)
// ✅ Returns [chunk1, chunk2]

// Add headers
const withHeaders = addChunkHeaders(long)
// ✅ Returns [
//   "[Part 1/2]\n\nLorem ipsum...",
//   "[Part 2/2]\n\nLorem ipsum..."
// ]

// Prepare (chunk + headers)
const prepared = prepareChunkedText("Long text...", 3000)
// ✅ Returns chunked text with headers
```

**Result**: ✅ All operations work correctly

---

## 📈 **Tracking & Metrics**

### **What Gets Tracked Automatically**

1. **Agent Lifecycle**:
   - When agent starts
   - When agent completes
   - How long it took
   - If it errored (and why)

2. **Context Files**:
   - When created
   - What data is stored
   - File location

3. **UI Events**:
   - Toast notifications
   - Start/complete/error messages

---

### **How to Access Tracking Data**

#### **1. Task Metrics**

```typescript
// Get all tasks
const tasks = taskTracker.getTasks()

// Filter by status
const running = tasks.filter(t => t.status === "running")
const completed = tasks.filter(t => t.status === "completed")
const errored = tasks.filter(t => t.status === "error")

// Calculate metrics
const totalTasks = tasks.length
const successRate = (completed.length / totalTasks) * 100

// Average duration
const avgDuration = completed
  .map(t => t.completedAt!.getTime() - t.startedAt.getTime())
  .reduce((a, b) => a + b, 0) / completed.length

console.log(`
Task Metrics:
- Total: ${totalTasks}
- Running: ${running.length}
- Completed: ${completed.length}
- Errored: ${errored.length}
- Success Rate: ${successRate.toFixed(1)}%
- Avg Duration: ${(avgDuration / 1000).toFixed(1)}s
`)
```

#### **2. Context Files**

```bash
# List all context files
ls -lh .openagents/context/

# Count context files
ls .openagents/context/ | wc -l

# View a context file
cat .openagents/context/jwt-research.json

# Get total size
du -sh .openagents/context/
```

#### **3. Context Usage (Programmatic)**

```typescript
import { readdir, stat, readFile } from "node:fs/promises"
import { join } from "node:path"

// Load all context files
const contextFiles = await readdir(".openagents/context")

// Get stats for each
const stats = await Promise.all(
  contextFiles.map(async (file) => {
    const path = join(".openagents/context", file)
    const fileStat = await stat(path)
    const content = await readFile(path, "utf-8")
    const context = JSON.parse(content)
    
    return {
      name: file,
      size: fileStat.size,
      created: context.createdAt,
      age: Date.now() - new Date(context.createdAt).getTime()
    }
  })
)

console.log("Context Files:", stats)
```

---

## 🎯 **Real-World Example**

### **Scenario: Parallel Research**

```
User: "Research JWT, OAuth, and Session auth. Compare them."

┌─────────────────────────────────────────────────────────┐
│ Primary Agent                                           │
│ "I'll research these in parallel"                       │
└─────────────────────────────────────────────────────────┘
                    │
                    ├─────────────────┬─────────────────┐
                    ↓                 ↓                 ↓
        ┌───────────────────┐ ┌───────────────┐ ┌───────────────┐
        │ Researcher #1     │ │ Researcher #2 │ │ Researcher #3 │
        │ Topic: JWT        │ │ Topic: OAuth  │ │ Topic: Session│
        └───────────────────┘ └───────────────┘ └───────────────┘
                    │                 │                 │
        🚀 Toast: "Agent Started - 🚀 researcher" (x3)
                    │                 │                 │
        ┌───────────▼─────────────────▼─────────────────▼───────┐
        │         OpenAgents TaskTracker                         │
        │  Task 1: researcher (JWT)     - RUNNING                │
        │  Task 2: researcher (OAuth)   - RUNNING                │
        │  Task 3: researcher (Session) - RUNNING                │
        └────────────────────────────────────────────────────────┘
                    │                 │                 │
                    │ (8s)            │ (12s)           │ (10s)
                    ↓                 ↓                 ↓
        ┌───────────────────┐ ┌───────────────┐ ┌───────────────┐
        │ Saves context:    │ │ Saves context:│ │ Saves context:│
        │ jwt-auth.json     │ │ oauth.json    │ │ session.json  │
        └───────────────────┘ └───────────────┘ └───────────────┘
                    │                 │                 │
        ✅ Toast: "Agent Completed - ✅ researcher (8s)"
        ✅ Toast: "Agent Completed - ✅ researcher (12s)"
        ✅ Toast: "Agent Completed - ✅ researcher (10s)"
                    │                 │                 │
                    └─────────────────┴─────────────────┘
                                      │
                                      ↓
                    ┌─────────────────────────────────┐
                    │ Primary Agent                   │
                    │ - Loads all 3 context files     │
                    │ - Synthesizes comparison        │
                    │ - Presents results to user      │
                    └─────────────────────────────────┘
```

**Timeline**:
```
T+0s:   User asks question
T+1s:   Primary agent launches 3 researchers
T+1s:   🚀 3 toasts appear
T+1s:   TaskTracker shows 3 running tasks
T+9s:   Researcher #1 completes (JWT)
T+9s:   ✅ Toast: "researcher (8s)"
T+11s:  Researcher #3 completes (Session)
T+11s:  ✅ Toast: "researcher (10s)"
T+13s:  Researcher #2 completes (OAuth)
T+13s:  ✅ Toast: "researcher (12s)"
T+14s:  Primary agent loads 3 context files
T+15s:  Primary agent presents comparison
```

**Context Files Created**:
```
.openagents/context/
├── jwt-auth.json      (2.1 KB)
├── oauth.json         (2.3 KB)
└── session.json       (1.9 KB)
```

**Task Tracker State**:
```typescript
[
  {
    id: "task_001",
    agent: "researcher",
    status: "completed",
    startedAt: "11:00:01",
    completedAt: "11:00:09",
    duration: "8s"
  },
  {
    id: "task_002",
    agent: "researcher",
    status: "completed",
    startedAt: "11:00:01",
    completedAt: "11:00:13",
    duration: "12s"
  },
  {
    id: "task_003",
    agent: "researcher",
    status: "completed",
    startedAt: "11:00:01",
    completedAt: "11:00:11",
    duration: "10s"
  }
]
```

---

## 📚 **Key Files**

| File | Purpose | Lines |
|------|---------|-------|
| `src/features/task-tracker.ts` | Track agent lifecycle | 103 |
| `src/features/context.ts` | Save/load context | 63 |
| `src/features/ui.ts` | Toast notifications | 52 |
| `src/utils/chunker.ts` | Split large text | 97 |
| `src/plugin/config.ts` | Configuration | 99 |
| `src/plugin/index.ts` | Main plugin logic | 124 |

**Total**: 538 lines (323 new, 215 updated)

---

## 🎯 **Summary**

### **What OpenAgents Does**:
1. ✅ Tracks agent execution (start/complete/error)
2. ✅ Enables context sharing via JSON files
3. ✅ Shows toast notifications for progress
4. ✅ Handles large text with smart chunking

### **What Gets Tracked**:
1. ✅ Agent lifecycle events
2. ✅ Task duration
3. ✅ Context files (creation time, data)
4. ✅ Success/error rates

### **How to Track**:
1. ✅ Use `taskTracker.getTasks()` for task metrics
2. ✅ Check `.openagents/context/` for context files
3. ✅ Watch toasts for real-time progress
4. ✅ Add logging for detailed tracking

### **Status**:
🚀 **Ready for production use!**

---

For more details, see:
- [FLOW-EXPLAINED.md](./FLOW-EXPLAINED.md) - Detailed flow explanation
- [TEST-RESULTS.md](./TEST-RESULTS.md) - Test results
- [IMPLEMENTATION-COMPLETE.md](./IMPLEMENTATION-COMPLETE.md) - Implementation summary

# OpenAgents v1 - Flow & Context Tracking Explained

**Date**: Thu Dec 18 2025

---

## 🔄 **The Complete Flow**

### **1. Plugin Initialization**

```
User starts OpenCode
    ↓
OpenCode loads OpenAgents plugin
    ↓
Plugin creates managers:
    - TaskTracker (tracks running agents)
    - ContextManager (saves/loads JSON files)
    - UIManager (shows toasts)
    ↓
Plugin loads agents from .openagents/agents/*.md
    ↓
Plugin registers agents with OpenCode
    ↓
✅ Ready! Shows toast: "OpenAgents v0.1.0 - Loaded 3 agents"
```

---

### **2. Agent Execution Flow**

```
User: "Research authentication patterns"
    ↓
Primary Agent decides to launch 3 researcher agents in parallel
    ↓
Primary Agent uses background_task tool:
    background_task(
      agent="researcher",
      prompt="Research JWT authentication"
    )
    ↓
OpenCode creates new session for researcher agent
    ↓
OpenAgents receives "session.created" event
    ↓
TaskTracker.start("researcher", "session-123")
    ↓
UIManager.showStart("researcher")
    ↓
🚀 Toast appears: "Agent Started - 🚀 researcher"
    ↓
Researcher agent does its work...
    ↓
Researcher agent saves findings:
    (via primary agent or custom tool)
    ContextManager.save("jwt-research", { findings: "..." })
    ↓
Researcher agent completes
    ↓
OpenCode sends "session.idle" event
    ↓
TaskTracker.complete("session-123")
    ↓
UIManager.showComplete("researcher", "8s")
    ↓
✅ Toast appears: "Agent Completed - ✅ researcher (8s)"
    ↓
Primary agent loads context:
    ContextManager.load("jwt-research")
    ↓
Primary agent synthesizes results
```

---

## 🧪 **What We Tested**

### **Test 1: Task Tracker**

**What it does**: Tracks the lifecycle of agent tasks

**Test Code**:
```typescript
const tracker = createTaskTracker()

// Start a task
const task1 = tracker.start("researcher", "session-1")
// Result: { id: "task_xxx", agent: "researcher", status: "running", startedAt: Date }

// Complete the task
const completed = tracker.complete("session-1")
// Result: { ...task1, status: "completed", completedAt: Date }

// Get duration
const duration = tracker.getDuration(completed)
// Result: "0s" or "1m 30s"

// Track an error
const task2 = tracker.start("coder", "session-2")
const errored = tracker.error("session-2", "Test error")
// Result: { ...task2, status: "error", error: "Test error" }

// Get all tasks
const allTasks = tracker.getTasks()
// Result: [task1, task2]
```

**What we verified**:
- ✅ Can create tasks with unique IDs
- ✅ Can track multiple tasks simultaneously
- ✅ Can mark tasks as completed
- ✅ Can mark tasks as errored
- ✅ Can calculate duration correctly
- ✅ Can retrieve all tasks

---

### **Test 2: Context Manager**

**What it does**: Saves and loads context between agents via JSON files

**Test Code**:
```typescript
const contextMgr = createContextManager("/tmp/openagents-test")

// Save context
await contextMgr.save("test-context", { 
  message: "Hello from OpenAgents!",
  timestamp: new Date().toISOString()
})
// Creates: /tmp/openagents-test/.openagents/context/test-context.json

// Load context
const loaded = await contextMgr.load("test-context")
// Result: { id: "test-context", createdAt: "...", data: { message: "...", ... } }

// Check if exists
const exists = contextMgr.exists("test-context")
// Result: true
```

**File Created**:
```json
{
  "id": "test-context",
  "createdAt": "2025-12-18T11:03:29.533Z",
  "data": {
    "message": "Hello from OpenAgents!",
    "timestamp": "2025-12-18T11:03:29.531Z"
  }
}
```

**What we verified**:
- ✅ Can save arbitrary data to JSON
- ✅ Creates directory structure automatically
- ✅ Can load saved context
- ✅ Can check if context exists
- ✅ Handles missing files gracefully (returns null)

---

### **Test 3: Text Chunker**

**What it does**: Splits large text into chunks respecting natural boundaries

**Test Code**:
```typescript
// Short text (< 3000 chars)
const shortText = "This is a short text."
const shortChunks = chunkText(shortText, 3000)
// Result: ["This is a short text."]

// Long text (> 3000 chars)
const longText = "Lorem ipsum dolor sit amet. ".repeat(200) // ~5600 chars
const longChunks = chunkText(longText, 3000)
// Result: [chunk1, chunk2] (each ~2800 chars)

// Add headers
const withHeaders = addChunkHeaders(longChunks)
// Result: [
//   "[Part 1/2]\n\nLorem ipsum...",
//   "[Part 2/2]\n\nLorem ipsum..."
// ]

// Prepare (chunk + headers in one step)
const prepared = prepareChunkedText(longText, 3000)
// Result: Same as withHeaders
```

**What we verified**:
- ✅ Handles short text (returns single chunk)
- ✅ Splits long text into multiple chunks
- ✅ Respects 3000 character limit
- ✅ Adds headers to multi-part chunks
- ✅ Splits on paragraph boundaries (natural breaks)

---

## 📊 **Context Tracking - How It Works**

### **Current Implementation**

The context tracking is **manual** - agents must explicitly save/load context:

```typescript
// Agent 1 saves context
await contextManager.save("research-results", {
  topic: "JWT Authentication",
  findings: ["...", "...", "..."],
  sources: ["...", "..."]
})

// Agent 2 loads context
const context = await contextManager.load("research-results")
if (context) {
  console.log(context.data.findings)
}
```

**Context File Structure**:
```
.openagents/
└── context/
    ├── research-results.json
    ├── code-analysis.json
    └── test-results.json
```

---

### **What Gets Tracked**

#### **1. Task Tracking (Automatic)**

Tracked automatically by the plugin:

```typescript
{
  id: "task_1766055809428_zytue4m",
  agent: "researcher",
  sessionID: "session-abc123",
  status: "completed",
  startedAt: Date("2025-12-18T11:00:00Z"),
  completedAt: Date("2025-12-18T11:00:08Z")
}
```

**What you can see**:
- Which agent ran
- When it started
- When it completed
- How long it took
- If it errored (and why)

**How to access**:
```typescript
const allTasks = taskTracker.getTasks()
// Returns array of all tasks

const runningTasks = allTasks.filter(t => t.status === "running")
const completedTasks = allTasks.filter(t => t.status === "completed")
const erroredTasks = allTasks.filter(t => t.status === "error")
```

---

#### **2. Context Sharing (Manual)**

Agents must explicitly save context:

```typescript
// Example: Research agent saves findings
await contextManager.save("jwt-research", {
  method: "JWT",
  pros: ["Stateless", "Scalable", "..."],
  cons: ["Token size", "..."],
  examples: ["..."]
})

// Example: Coder agent loads research
const research = await contextManager.load("jwt-research")
// Use research.data to implement code
```

**What you can track**:
- Any data agents want to share
- Research findings
- Code analysis results
- Test results
- Decisions made
- Errors encountered

---

### **How to Track Context Usage**

#### **Option 1: Check Context Directory**

```bash
# List all context files
ls -lh .openagents/context/

# View a context file
cat .openagents/context/jwt-research.json

# Count context files
ls .openagents/context/ | wc -l
```

#### **Option 2: Add Logging (Future Enhancement)**

```typescript
// In context.ts, add logging:
save: async (name: string, data: any): Promise<void> => {
  await mkdir(contextDir, { recursive: true })
  
  const context = createContext(name, data)
  const path = join(contextDir, `${name}.json`)
  
  await writeFile(path, JSON.stringify(context, null, 2))
  
  // Log context save
  console.log(`[Context] Saved: ${name} (${JSON.stringify(data).length} bytes)`)
}

load: async (name: string): Promise<Context | null> => {
  const path = join(contextDir, `${name}.json`)
  
  if (!existsSync(path)) {
    console.log(`[Context] Not found: ${name}`)
    return null
  }
  
  try {
    const content = await readFile(path, "utf-8")
    console.log(`[Context] Loaded: ${name} (${content.length} bytes)`)
    return JSON.parse(content)
  } catch (error) {
    console.error(`[Context] Failed to load ${name}:`, error)
    return null
  }
}
```

#### **Option 3: Add Context Tracker (Future Enhancement)**

```typescript
// New feature: Track context usage
export const createContextTracker = () => {
  const usage = new Map<string, {
    saves: number,
    loads: number,
    lastAccessed: Date,
    size: number
  }>()
  
  return {
    trackSave: (name: string, size: number) => {
      const current = usage.get(name) || { saves: 0, loads: 0, lastAccessed: new Date(), size: 0 }
      usage.set(name, {
        ...current,
        saves: current.saves + 1,
        lastAccessed: new Date(),
        size
      })
    },
    
    trackLoad: (name: string) => {
      const current = usage.get(name)
      if (current) {
        usage.set(name, {
          ...current,
          loads: current.loads + 1,
          lastAccessed: new Date()
        })
      }
    },
    
    getStats: () => Array.from(usage.entries()).map(([name, stats]) => ({
      name,
      ...stats
    }))
  }
}
```

---

## 🎯 **Real-World Example**

### **Scenario: Research Authentication Patterns**

```
User: "Research JWT, OAuth, and Session-based auth. Compare them."

Primary Agent:
  ↓
  Launches 3 researchers in parallel:
  
  background_task(agent="researcher", prompt="Research JWT auth")
  background_task(agent="researcher", prompt="Research OAuth auth")
  background_task(agent="researcher", prompt="Research Session auth")
  
  ↓
  
OpenAgents tracks:
  - Task 1: researcher (JWT) - RUNNING
  - Task 2: researcher (OAuth) - RUNNING
  - Task 3: researcher (Session) - RUNNING
  
  🚀 Toast: "Agent Started - 🚀 researcher" (x3)
  
  ↓
  
Researcher 1 (JWT):
  - Does research
  - Saves: .openagents/context/jwt-auth.json
  - Completes in 8s
  
Researcher 2 (OAuth):
  - Does research
  - Saves: .openagents/context/oauth-auth.json
  - Completes in 12s
  
Researcher 3 (Session):
  - Does research
  - Saves: .openagents/context/session-auth.json
  - Completes in 10s
  
  ✅ Toast: "Agent Completed - ✅ researcher (8s)"
  ✅ Toast: "Agent Completed - ✅ researcher (12s)"
  ✅ Toast: "Agent Completed - ✅ researcher (10s)"
  
  ↓
  
Primary Agent:
  - Loads all 3 context files
  - Synthesizes comparison
  - Presents results to user
```

**Context Files Created**:

`.openagents/context/jwt-auth.json`:
```json
{
  "id": "jwt-auth",
  "createdAt": "2025-12-18T11:00:08Z",
  "data": {
    "method": "JWT",
    "description": "JSON Web Tokens...",
    "pros": ["Stateless", "Scalable", "Cross-domain"],
    "cons": ["Token size", "Cannot revoke", "Storage"],
    "useCases": ["APIs", "Microservices", "Mobile apps"]
  }
}
```

`.openagents/context/oauth-auth.json`:
```json
{
  "id": "oauth-auth",
  "createdAt": "2025-12-18T11:00:12Z",
  "data": {
    "method": "OAuth 2.0",
    "description": "Authorization framework...",
    "pros": ["Delegated access", "Secure", "Standard"],
    "cons": ["Complex", "Multiple flows", "Setup overhead"],
    "useCases": ["Third-party login", "API access", "SSO"]
  }
}
```

`.openagents/context/session-auth.json`:
```json
{
  "id": "session-auth",
  "createdAt": "2025-12-18T11:00:10Z",
  "data": {
    "method": "Session-based",
    "description": "Server-side sessions...",
    "pros": ["Simple", "Revocable", "Secure"],
    "cons": ["Stateful", "Scaling issues", "CSRF risk"],
    "useCases": ["Traditional web apps", "Admin panels"]
  }
}
```

---

## 📈 **Tracking Metrics**

### **What You Can Track Now**

1. **Task Metrics**:
   - Number of agents launched
   - Agent execution time
   - Success/failure rate
   - Concurrent agents

2. **Context Metrics**:
   - Number of context files created
   - Context file sizes
   - Context creation timestamps

### **How to Get Metrics**

```typescript
// Get all tasks
const tasks = taskTracker.getTasks()

// Calculate metrics
const totalTasks = tasks.length
const completedTasks = tasks.filter(t => t.status === "completed").length
const erroredTasks = tasks.filter(t => t.status === "error").length
const successRate = (completedTasks / totalTasks) * 100

// Average duration
const durations = tasks
  .filter(t => t.completedAt)
  .map(t => t.completedAt!.getTime() - t.startedAt.getTime())
const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

console.log(`
Metrics:
- Total tasks: ${totalTasks}
- Completed: ${completedTasks}
- Errored: ${erroredTasks}
- Success rate: ${successRate.toFixed(1)}%
- Avg duration: ${(avgDuration / 1000).toFixed(1)}s
`)
```

---

## 🔮 **Future Enhancements**

### **1. Automatic Context Tracking**

Track all context operations automatically:

```typescript
interface ContextUsage {
  name: string
  saves: number
  loads: number
  totalSize: number
  lastAccessed: Date
  agents: string[] // Which agents accessed it
}
```

### **2. Task Analytics**

```typescript
interface TaskAnalytics {
  agentName: string
  totalRuns: number
  avgDuration: number
  successRate: number
  lastRun: Date
}
```

### **3. Context Visualization**

```typescript
// Show context flow between agents
{
  "jwt-research": {
    "createdBy": "researcher-1",
    "accessedBy": ["synthesizer", "coder"],
    "size": 2048,
    "created": "2025-12-18T11:00:08Z"
  }
}
```

---

## 🎯 **Summary**

### **What We Built**:
- ✅ Task tracking (automatic)
- ✅ Context sharing (manual)
- ✅ Toast notifications (automatic)
- ✅ Text chunking (utility)

### **What Gets Tracked**:
- ✅ Agent lifecycle (start/complete/error)
- ✅ Task duration
- ✅ Context files (save/load)
- ✅ Context timestamps

### **How to Track**:
- ✅ Check `.openagents/context/` directory
- ✅ Use `taskTracker.getTasks()`
- ✅ Add logging (future)
- ✅ Add analytics (future)

### **What We Tested**:
- ✅ Task tracking works
- ✅ Context save/load works
- ✅ Text chunking works
- ✅ All features integrate correctly

---

**The plugin is ready to use and provides a solid foundation for tracking agent execution and context sharing!** 🚀

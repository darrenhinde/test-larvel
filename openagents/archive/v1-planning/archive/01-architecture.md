# Architecture Design - Functional & Modular

**Last Updated**: Thu Dec 18 2025

---

## 🏛️ Core Principles

### **1. Functional Programming**
- **Pure Functions**: Same input → Same output, no side effects
- **Immutability**: Data doesn't change, create new versions
- **Composition**: Build complex behavior from simple functions
- **Explicit Dependencies**: All inputs passed as parameters

### **2. Separation of Concerns**
Each module has ONE responsibility:
- **Task Manager**: Track agent execution
- **Context Manager**: Handle context storage/retrieval
- **Cost Manager**: Track and limit costs
- **UI Manager**: Show notifications
- **MCP Manager**: Configure MCP access

### **3. Data Flow**
```
User Request
    ↓
Primary Agent
    ↓
OpenAgents Plugin
    ↓
Task Manager → Context Manager → Cost Manager
    ↓              ↓                ↓
Background     Context Files    Cost Tracking
Sessions       (.json)          (in-memory)
    ↓
UI Manager (Toasts)
    ↓
User Feedback
```

---

## 📦 Module Architecture

### **1. Task Manager**

**Responsibility**: Track and manage agent execution

**Pure Functions**:
```typescript
// Create task (pure - returns new task)
const createTask = (input: LaunchInput): AgentTask => ({
  id: generateId(),
  sessionID: "",  // Will be set after session creation
  parentSessionID: input.parentSessionID,
  agentName: input.agent,
  description: input.description,
  status: "pending",
  startedAt: new Date(),
  context: {
    input: input.contextInput || [],
    output: input.contextOutput,
    artifacts: []
  },
  cost: {
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    model: input.model
  }
})

// Update task status (pure - returns new task)
const updateTaskStatus = (
  task: AgentTask, 
  status: TaskStatus
): AgentTask => ({
  ...task,
  status,
  completedAt: status === "completed" ? new Date() : task.completedAt
})

// Get running tasks (pure - filters existing array)
const getRunningTasks = (tasks: AgentTask[]): AgentTask[] =>
  tasks.filter(task => task.status === "running")

// Calculate duration (pure)
const calculateDuration = (task: AgentTask): number => {
  const end = task.completedAt || new Date()
  return end.getTime() - task.startedAt.getTime()
}
```

**Impure Functions** (clearly marked):
```typescript
// Side effect: Creates session, updates external state
const launchTask = async (
  task: AgentTask,
  client: Client
): Promise<AgentTask> => {
  // Create session (side effect)
  const session = await client.session.create({
    body: {
      parentID: task.parentSessionID,
      title: `Agent: ${task.agentName}`
    }
  })
  
  // Return updated task (new object)
  return {
    ...task,
    sessionID: session.data.id,
    status: "running"
  }
}
```

**State Management**:
```typescript
// Immutable state updates
class TaskManager {
  private tasks: Map<string, AgentTask>
  
  // Returns new task, doesn't mutate
  addTask(task: AgentTask): AgentTask {
    this.tasks.set(task.id, task)
    return task
  }
  
  // Returns new task, doesn't mutate original
  updateTask(id: string, updates: Partial<AgentTask>): AgentTask | null {
    const existing = this.tasks.get(id)
    if (!existing) return null
    
    const updated = { ...existing, ...updates }
    this.tasks.set(id, updated)
    return updated
  }
  
  // Returns copy of tasks
  getTasks(): AgentTask[] {
    return Array.from(this.tasks.values())
  }
}
```

---

### **2. Context Manager**

**Responsibility**: Store and retrieve context between agents

**Pure Functions**:
```typescript
// Create context data (pure)
const createContext = (
  id: string,
  data: unknown,
  metadata: ContextMetadata
): ContextData => ({
  id,
  createdAt: new Date().toISOString(),
  createdBy: metadata.agentName,
  expiresAt: calculateExpiry(metadata.ttl),
  data,
  metadata: {
    tokens: metadata.tokens || 0,
    cost: metadata.cost || 0,
    size: JSON.stringify(data).length
  }
})

// Merge multiple contexts (pure)
const mergeContexts = (contexts: ContextData[]): ContextData => ({
  id: "merged",
  createdAt: new Date().toISOString(),
  createdBy: "system",
  data: contexts.reduce((acc, ctx) => ({ ...acc, ...ctx.data }), {}),
  metadata: {
    tokens: contexts.reduce((sum, ctx) => sum + ctx.metadata.tokens, 0),
    cost: contexts.reduce((sum, ctx) => sum + ctx.metadata.cost, 0),
    size: contexts.reduce((sum, ctx) => sum + ctx.metadata.size, 0)
  }
})

// Filter expired contexts (pure)
const filterExpired = (contexts: ContextData[]): ContextData[] =>
  contexts.filter(ctx => new Date(ctx.expiresAt) > new Date())

// Calculate expiry time (pure)
const calculateExpiry = (ttl: number = 3600): string => {
  const expiry = new Date()
  expiry.setSeconds(expiry.getSeconds() + ttl)
  return expiry.toISOString()
}
```

**Impure Functions**:
```typescript
// Side effect: Reads from filesystem
const loadContext = async (
  name: string,
  contextDir: string
): Promise<ContextData | null> => {
  const path = join(contextDir, `${name}.json`)
  
  if (!existsSync(path)) return null
  
  const content = await readFile(path, "utf-8")
  return JSON.parse(content)
}

// Side effect: Writes to filesystem
const saveContext = async (
  context: ContextData,
  contextDir: string
): Promise<void> => {
  const path = join(contextDir, `${context.id}.json`)
  await writeFile(path, JSON.stringify(context, null, 2))
}

// Side effect: Deletes from filesystem
const deleteContext = async (
  name: string,
  contextDir: string
): Promise<void> => {
  const path = join(contextDir, `${name}.json`)
  if (existsSync(path)) {
    await unlink(path)
  }
}
```

**Composition**:
```typescript
// Compose pure functions
const loadAndMergeContexts = async (
  names: string[],
  contextDir: string
): Promise<ContextData | null> => {
  // Load all contexts (impure)
  const contexts = await Promise.all(
    names.map(name => loadContext(name, contextDir))
  )
  
  // Filter nulls (pure)
  const validContexts = contexts.filter((ctx): ctx is ContextData => ctx !== null)
  
  if (validContexts.length === 0) return null
  
  // Filter expired (pure)
  const activeContexts = filterExpired(validContexts)
  
  if (activeContexts.length === 0) return null
  
  // Merge (pure)
  return mergeContexts(activeContexts)
}
```

---

### **3. Cost Manager**

**Responsibility**: Track costs and enforce limits

**Pure Functions**:
```typescript
// Calculate cost (pure)
const calculateCost = (
  inputTokens: number,
  outputTokens: number,
  model: string
): number => {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

// Check if over limit (pure)
const isOverLimit = (
  current: number,
  limit: number
): boolean => current >= limit

// Calculate remaining budget (pure)
const remainingBudget = (
  spent: number,
  limit: number
): number => Math.max(0, limit - spent)

// Aggregate costs (pure)
const aggregateCosts = (tasks: AgentTask[]): CostSummary => ({
  total: tasks.reduce((sum, t) => sum + t.cost.estimatedCost, 0),
  byAgent: tasks.reduce((acc, t) => {
    acc[t.agentName] = (acc[t.agentName] || 0) + t.cost.estimatedCost
    return acc
  }, {} as Record<string, number>),
  byModel: tasks.reduce((acc, t) => {
    acc[t.cost.model] = (acc[t.cost.model] || 0) + t.cost.estimatedCost
    return acc
  }, {} as Record<string, number>)
})
```

**Impure Functions**:
```typescript
// Side effect: Checks and updates state
const checkAndEnforceLimit = (
  agentName: string,
  estimatedCost: number,
  limits: CostLimits,
  tracker: CostTracker
): Result<void> => {
  const currentSpent = tracker.getSpent(agentName)
  const newTotal = currentSpent + estimatedCost
  
  if (isOverLimit(newTotal, limits.perAgent)) {
    return {
      ok: false,
      error: new Error(
        `Agent ${agentName} would exceed limit: ` +
        `$${newTotal.toFixed(4)} > $${limits.perAgent.toFixed(4)}`
      )
    }
  }
  
  return { ok: true, value: undefined }
}
```

---

### **4. Chunking Utility**

**Responsibility**: Handle 3k prompt limit

**Pure Functions**:
```typescript
// Split text into chunks (pure)
const chunkText = (
  text: string,
  maxSize: number = 3000
): string[] => {
  if (text.length <= maxSize) return [text]
  
  // Split on paragraph boundaries
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ""
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + para
    } else {
      if (currentChunk) chunks.push(currentChunk)
      
      // If single paragraph is too large, split on sentences
      if (para.length > maxSize) {
        chunks.push(...chunkBySentences(para, maxSize))
        currentChunk = ""
      } else {
        currentChunk = para
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk)
  
  return chunks
}

// Split by sentences (pure)
const chunkBySentences = (
  text: string,
  maxSize: number
): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let currentChunk = ""
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxSize) {
      currentChunk += (currentChunk ? " " : "") + sentence
    } else {
      if (currentChunk) chunks.push(currentChunk)
      
      // If single sentence is too large, hard split
      if (sentence.length > maxSize) {
        chunks.push(...hardSplit(sentence, maxSize))
        currentChunk = ""
      } else {
        currentChunk = sentence
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk)
  
  return chunks
}

// Hard split (pure)
const hardSplit = (
  text: string,
  maxSize: number
): string[] => {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += maxSize) {
    chunks.push(text.slice(i, i + maxSize))
  }
  return chunks
}

// Add chunk headers (pure)
const addChunkHeaders = (chunks: string[]): string[] => {
  if (chunks.length === 1) return chunks
  
  return chunks.map((chunk, i) => 
    `[Part ${i + 1}/${chunks.length}]\n\n${chunk}`
  )
}
```

**Composition**:
```typescript
// Compose chunking pipeline (pure)
const prepareChunkedText = (text: string, maxSize: number = 3000): string[] =>
  pipe(
    text,
    (t) => chunkText(t, maxSize),
    (chunks) => addChunkHeaders(chunks)
  )

// Helper: pipe function
const pipe = <T>(
  value: T,
  ...fns: Array<(arg: any) => any>
): any => fns.reduce((acc, fn) => fn(acc), value)
```

---

## 🔄 Data Flow Examples

### **Example 1: Launch Single Agent**

```typescript
// 1. Pure: Create task
const task = createTask({
  agent: "researcher",
  description: "Find auth patterns",
  parentSessionID: "session-123",
  contextInput: ["requirements"],
  contextOutput: "research-results",
  model: "opencode/grok-fast"
})

// 2. Pure: Load context
const context = await loadAndMergeContexts(
  task.context.input,
  ".openagents/context"
)

// 3. Pure: Check cost limit
const costCheck = checkCostLimit(
  task.agentName,
  estimateCost(task),
  config.costLimits
)

if (!costCheck.ok) {
  await notifyError(costCheck.error)
  return
}

// 4. Impure: Launch task
const launchedTask = await launchTask(task, client)

// 5. Impure: Show toast
await showToast({
  title: "Agent Started",
  message: `${task.agentName}: ${task.description}`,
  variant: "info"
})

// 6. Pure: Add to tracker
taskManager.addTask(launchedTask)
```

### **Example 2: Parallel Execution**

```typescript
// 1. Pure: Create multiple tasks
const tasks = [
  createTask({ agent: "researcher-1", ... }),
  createTask({ agent: "researcher-2", ... }),
  createTask({ agent: "researcher-3", ... })
]

// 2. Pure: Check total cost
const totalCost = tasks.reduce(
  (sum, t) => sum + estimateCost(t),
  0
)

const costCheck = isOverLimit(totalCost, config.costLimits.perWorkflow)

if (costCheck) {
  await notifyError(new Error("Workflow cost limit exceeded"))
  return
}

// 3. Impure: Launch all in parallel
const launchedTasks = await Promise.all(
  tasks.map(task => launchTask(task, client))
)

// 4. Impure: Show progress toast
await showToast({
  title: "Parallel Execution",
  message: `Started ${tasks.length} agents`,
  variant: "info"
})

// 5. Pure: Track all tasks
launchedTasks.forEach(task => taskManager.addTask(task))
```

---

## 🧪 Testing Strategy

### **Pure Functions** (Easy to Test)
```typescript
describe("chunkText", () => {
  it("returns single chunk for small text", () => {
    const result = chunkText("Hello world", 3000)
    expect(result).toEqual(["Hello world"])
  })
  
  it("splits on paragraph boundaries", () => {
    const text = "Para 1\n\nPara 2\n\nPara 3"
    const result = chunkText(text, 10)
    expect(result.length).toBeGreaterThan(1)
  })
  
  it("adds headers to multiple chunks", () => {
    const chunks = ["chunk1", "chunk2"]
    const result = addChunkHeaders(chunks)
    expect(result[0]).toContain("[Part 1/2]")
    expect(result[1]).toContain("[Part 2/2]")
  })
})
```

### **Impure Functions** (Mock Dependencies)
```typescript
describe("launchTask", () => {
  it("creates session and updates task", async () => {
    const mockClient = {
      session: {
        create: vi.fn().mockResolvedValue({
          data: { id: "session-456" }
        })
      }
    }
    
    const task = createTask({ ... })
    const result = await launchTask(task, mockClient)
    
    expect(result.sessionID).toBe("session-456")
    expect(result.status).toBe("running")
    expect(mockClient.session.create).toHaveBeenCalledOnce()
  })
})
```

---

## 📊 Module Dependencies

```
┌─────────────────┐
│  Plugin Entry   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│Config│  │ Tools │
└───┬──┘  └──┬────┘
    │        │
    └────┬───┘
         │
    ┌────▼─────────────────────┐
    │                          │
┌───▼────┐  ┌────▼────┐  ┌───▼────┐
│  Task  │  │ Context │  │  Cost  │
│Manager │  │ Manager │  │Manager │
└───┬────┘  └────┬────┘  └───┬────┘
    │            │            │
    └────────┬───┴────────────┘
             │
        ┌────▼────┐
        │   UI    │
        │ Manager │
        └─────────┘
```

**Dependency Rules**:
- ✅ Lower layers don't know about upper layers
- ✅ Each module has clear interface
- ✅ No circular dependencies
- ✅ Easy to test in isolation

---

**Next**: [02-config-schema.md](./02-config-schema.md) - Configuration design

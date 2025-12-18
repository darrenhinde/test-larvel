# Functional Programming Patterns

**Last Updated**: Thu Dec 18 2025

---

## 🎯 Why Functional Programming?

### **Benefits**:
- ✅ **Easier to understand** - Clear input/output contracts
- ✅ **Easier to test** - Pure functions are predictable
- ✅ **Easier to debug** - No hidden state changes
- ✅ **Easier to maintain** - Small, focused functions
- ✅ **Easier to compose** - Build complex from simple

---

## 📐 Core Principles

### **1. Pure Functions**

**Definition**: Same input → Same output, no side effects

```typescript
// ✅ GOOD: Pure function
const calculateCost = (
  inputTokens: number,
  outputTokens: number,
  pricePerToken: number
): number => {
  return (inputTokens + outputTokens) * pricePerToken
}

// ❌ BAD: Impure function (modifies external state)
let totalCost = 0
const calculateCost = (tokens: number) => {
  totalCost += tokens * 0.001  // Side effect!
  return totalCost
}
```

### **2. Immutability**

**Definition**: Data doesn't change, create new versions

```typescript
// ✅ GOOD: Immutable update
const updateTask = (
  task: AgentTask,
  status: TaskStatus
): AgentTask => ({
  ...task,  // Copy all properties
  status,   // Update status
  completedAt: status === "completed" ? new Date() : task.completedAt
})

// ❌ BAD: Mutable update
const updateTask = (task: AgentTask, status: TaskStatus) => {
  task.status = status  // Mutates original!
  if (status === "completed") {
    task.completedAt = new Date()
  }
  return task
}
```

### **3. Composition**

**Definition**: Build complex behavior from simple functions

```typescript
// ✅ GOOD: Compose small functions
const processAgentResponse = (text: string): ChunkedContent =>
  pipe(
    text,
    (t) => sanitizeText(t),
    (t) => chunkText(t, 3000),
    (chunks) => addChunkHeaders(chunks),
    (chunks) => ({ chunks, metadata: createMetadata(chunks) })
  )

// Helper: pipe function
const pipe = <T>(
  value: T,
  ...fns: Array<(arg: any) => any>
): any => fns.reduce((acc, fn) => fn(acc), value)

// ❌ BAD: Monolithic function
const processAgentResponse = (text: string) => {
  // 100 lines of mixed concerns...
}
```

---

## 🧩 Common Patterns

### **Pattern 1: Result Type (Error Handling)**

```typescript
// Type-safe error handling
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E }

// Pure function that can fail
const parseConfig = (content: string): Result<Config> => {
  try {
    const parsed = JSON.parse(content)
    const validated = ConfigSchema.parse(parsed)
    return { ok: true, value: validated }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

// Usage
const result = parseConfig(fileContent)

if (!result.ok) {
  console.error("Config error:", result.error.message)
  return
}

const config = result.value  // Type-safe!
```

### **Pattern 2: Option Type (Nullable Values)**

```typescript
// Type-safe nullable handling
type Option<T> = 
  | { some: true; value: T }
  | { some: false }

// Pure function that may not find value
const findTask = (
  tasks: AgentTask[],
  id: string
): Option<AgentTask> => {
  const task = tasks.find(t => t.id === id)
  
  return task
    ? { some: true, value: task }
    : { some: false }
}

// Usage
const taskOption = findTask(tasks, "task-123")

if (taskOption.some) {
  console.log("Found:", taskOption.value.description)
} else {
  console.log("Task not found")
}

// Helper: map over Option
const mapOption = <T, U>(
  option: Option<T>,
  fn: (value: T) => U
): Option<U> =>
  option.some
    ? { some: true, value: fn(option.value) }
    : { some: false }
```

### **Pattern 3: Pipe & Compose**

```typescript
// Pipe: left-to-right composition
const pipe = <T>(
  value: T,
  ...fns: Array<(arg: any) => any>
): any => fns.reduce((acc, fn) => fn(acc), value)

// Compose: right-to-left composition
const compose = <T>(
  ...fns: Array<(arg: any) => any>
): ((value: T) => any) =>
  (value: T) => fns.reduceRight((acc, fn) => fn(acc), value)

// Usage
const processText = (text: string): string =>
  pipe(
    text,
    trim,
    toLowerCase,
    removeSpecialChars,
    capitalize
  )

// Or create reusable function
const textProcessor = compose(
  capitalize,
  removeSpecialChars,
  toLowerCase,
  trim
)

const result = textProcessor("  Hello World!  ")
```

### **Pattern 4: Currying**

```typescript
// Currying: Transform multi-arg function into sequence of single-arg functions

// Regular function
const calculateCost = (
  inputTokens: number,
  outputTokens: number,
  pricePerToken: number
): number => (inputTokens + outputTokens) * pricePerToken

// Curried version
const calculateCostCurried = (pricePerToken: number) =>
  (inputTokens: number) =>
    (outputTokens: number) =>
      (inputTokens + outputTokens) * pricePerToken

// Usage: Create specialized functions
const calculateWithPrice = calculateCostCurried(0.001)
const calculateForInput = calculateWithPrice(1000)
const finalCost = calculateForInput(500)  // 1.5

// Practical example
const filterTasks = (predicate: (task: AgentTask) => boolean) =>
  (tasks: AgentTask[]): AgentTask[] =>
    tasks.filter(predicate)

const getRunningTasks = filterTasks(t => t.status === "running")
const getCompletedTasks = filterTasks(t => t.status === "completed")

const running = getRunningTasks(allTasks)
const completed = getCompletedTasks(allTasks)
```

### **Pattern 5: Map, Filter, Reduce**

```typescript
// Map: Transform each element
const getTaskDescriptions = (tasks: AgentTask[]): string[] =>
  tasks.map(task => task.description)

// Filter: Select elements
const getExpensiveTasks = (tasks: AgentTask[], threshold: number): AgentTask[] =>
  tasks.filter(task => task.cost.estimatedCost > threshold)

// Reduce: Aggregate elements
const getTotalCost = (tasks: AgentTask[]): number =>
  tasks.reduce((sum, task) => sum + task.cost.estimatedCost, 0)

// Combine them
const getExpensiveTasksCost = (tasks: AgentTask[], threshold: number): number =>
  pipe(
    tasks,
    (t) => getExpensiveTasks(t, threshold),
    (t) => getTotalCost(t)
  )
```

---

## 🏗️ Architectural Patterns

### **Pattern 1: Separate Pure & Impure**

```typescript
// ✅ GOOD: Clear separation

// Pure: Business logic
const calculateTaskDuration = (task: AgentTask): number => {
  const end = task.completedAt || new Date()
  return end.getTime() - task.startedAt.getTime()
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

// Impure: Side effects (clearly marked)
const showTaskDuration = async (task: AgentTask, client: Client): Promise<void> => {
  const duration = calculateTaskDuration(task)  // Pure
  const formatted = formatDuration(duration)     // Pure
  
  // Impure: Network call
  await client.tui.showToast({
    body: {
      title: "Task Completed",
      message: `Duration: ${formatted}`
    }
  })
}
```

### **Pattern 2: Dependency Injection**

```typescript
// ✅ GOOD: Dependencies passed explicitly

interface Dependencies {
  client: Client
  config: Config
  logger: Logger
}

const launchAgent = (deps: Dependencies) =>
  async (input: LaunchInput): Promise<Result<AgentTask>> => {
    const { client, config, logger } = deps
    
    // All dependencies explicit
    logger.info("Launching agent:", input.agent)
    
    const task = createTask(input)  // Pure
    
    const session = await client.session.create({
      body: { parentID: input.parentSessionID }
    })
    
    return { ok: true, value: { ...task, sessionID: session.data.id } }
  }

// Usage
const launch = launchAgent({ client, config, logger })
const result = await launch(input)
```

### **Pattern 3: Factory Functions**

```typescript
// ✅ GOOD: Create configured functions

const createTaskManager = (config: Config) => {
  const tasks = new Map<string, AgentTask>()
  
  return {
    // Pure: Get tasks
    getTasks: (): AgentTask[] =>
      Array.from(tasks.values()),
    
    // Pure: Find task
    findTask: (id: string): Option<AgentTask> => {
      const task = tasks.get(id)
      return task ? { some: true, value: task } : { some: false }
    },
    
    // Impure: Add task (mutates internal state)
    addTask: (task: AgentTask): void => {
      tasks.set(task.id, task)
    },
    
    // Impure: Update task
    updateTask: (id: string, updates: Partial<AgentTask>): Option<AgentTask> => {
      const existing = tasks.get(id)
      if (!existing) return { some: false }
      
      const updated = { ...existing, ...updates }
      tasks.set(id, updated)
      return { some: true, value: updated }
    }
  }
}

// Usage
const taskManager = createTaskManager(config)
taskManager.addTask(task)
const tasks = taskManager.getTasks()
```

---

## 🧪 Testing Patterns

### **Pure Functions: Easy to Test**

```typescript
describe("calculateCost", () => {
  it("calculates cost correctly", () => {
    const result = calculateCost(1000, 500, 0.001)
    expect(result).toBe(1.5)
  })
  
  it("handles zero tokens", () => {
    const result = calculateCost(0, 0, 0.001)
    expect(result).toBe(0)
  })
  
  it("is deterministic", () => {
    const result1 = calculateCost(1000, 500, 0.001)
    const result2 = calculateCost(1000, 500, 0.001)
    expect(result1).toBe(result2)
  })
})
```

### **Impure Functions: Mock Dependencies**

```typescript
describe("launchAgent", () => {
  it("creates session and returns task", async () => {
    const mockClient = {
      session: {
        create: vi.fn().mockResolvedValue({
          data: { id: "session-123" }
        })
      }
    }
    
    const mockLogger = {
      info: vi.fn()
    }
    
    const launch = launchAgent({
      client: mockClient,
      config,
      logger: mockLogger
    })
    
    const result = await launch(input)
    
    expect(result.ok).toBe(true)
    expect(result.value.sessionID).toBe("session-123")
    expect(mockClient.session.create).toHaveBeenCalledOnce()
    expect(mockLogger.info).toHaveBeenCalled()
  })
})
```

---

## 📚 Real-World Examples

### **Example 1: Task Processing Pipeline**

```typescript
// Pure functions
const filterRunningTasks = (tasks: AgentTask[]): AgentTask[] =>
  tasks.filter(t => t.status === "running")

const sortByStartTime = (tasks: AgentTask[]): AgentTask[] =>
  [...tasks].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

const takeLast = (n: number) =>
  <T>(items: T[]): T[] =>
    items.slice(-n)

const formatTaskSummary = (task: AgentTask): string =>
  `${task.agentName}: ${task.description} (${task.status})`

// Compose pipeline
const getRecentRunningTasks = (tasks: AgentTask[], count: number): string[] =>
  pipe(
    tasks,
    filterRunningTasks,
    sortByStartTime,
    takeLast(count),
    (tasks) => tasks.map(formatTaskSummary)
  )

// Usage
const summaries = getRecentRunningTasks(allTasks, 5)
```

### **Example 2: Context Loading with Error Handling**

```typescript
// Pure: Merge contexts
const mergeContexts = (contexts: ContextData[]): ContextData => ({
  id: "merged",
  createdAt: new Date().toISOString(),
  data: contexts.reduce((acc, ctx) => ({ ...acc, ...ctx.data }), {}),
  metadata: {
    tokens: contexts.reduce((sum, ctx) => sum + ctx.metadata.tokens, 0),
    cost: contexts.reduce((sum, ctx) => sum + ctx.metadata.cost, 0)
  }
})

// Pure: Filter expired
const filterExpired = (contexts: ContextData[]): ContextData[] =>
  contexts.filter(ctx => new Date(ctx.expiresAt) > new Date())

// Impure: Load from file
const loadContext = async (
  name: string,
  dir: string
): Promise<Result<ContextData>> => {
  try {
    const path = join(dir, `${name}.json`)
    const content = await readFile(path, "utf-8")
    const data = JSON.parse(content)
    return { ok: true, value: data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

// Compose: Load and merge
const loadAndMergeContexts = async (
  names: string[],
  dir: string
): Promise<Result<ContextData>> => {
  // Load all (impure)
  const results = await Promise.all(
    names.map(name => loadContext(name, dir))
  )
  
  // Extract successful results (pure)
  const contexts = results
    .filter((r): r is { ok: true; value: ContextData } => r.ok)
    .map(r => r.value)
  
  if (contexts.length === 0) {
    return { ok: false, error: new Error("No contexts found") }
  }
  
  // Filter expired (pure)
  const active = filterExpired(contexts)
  
  if (active.length === 0) {
    return { ok: false, error: new Error("All contexts expired") }
  }
  
  // Merge (pure)
  const merged = mergeContexts(active)
  
  return { ok: true, value: merged }
}
```

---

## 🎯 Best Practices

### **1. Keep Functions Small**
```typescript
// ✅ GOOD: One responsibility
const isExpired = (context: ContextData): boolean =>
  new Date(context.expiresAt) < new Date()

// ❌ BAD: Multiple responsibilities
const processContext = (context: ContextData) => {
  // Checks expiry, validates, transforms, saves...
}
```

### **2. Name Functions Clearly**
```typescript
// ✅ GOOD: Clear intent
const filterExpiredContexts = (contexts: ContextData[]): ContextData[] =>
  contexts.filter(ctx => !isExpired(ctx))

// ❌ BAD: Unclear
const process = (data: any[]): any[] =>
  data.filter(d => check(d))
```

### **3. Avoid Nested Ifs**
```typescript
// ✅ GOOD: Early returns
const validateTask = (task: AgentTask): Result<AgentTask> => {
  if (!task.agentName) {
    return { ok: false, error: new Error("Missing agent name") }
  }
  
  if (!task.description) {
    return { ok: false, error: new Error("Missing description") }
  }
  
  if (task.cost.estimatedCost < 0) {
    return { ok: false, error: new Error("Invalid cost") }
  }
  
  return { ok: true, value: task }
}

// ❌ BAD: Nested ifs
const validateTask = (task: AgentTask) => {
  if (task.agentName) {
    if (task.description) {
      if (task.cost.estimatedCost >= 0) {
        return { ok: true, value: task }
      }
    }
  }
  return { ok: false, error: new Error("Invalid") }
}
```

### **4. Use Type Guards**
```typescript
// Type guard
const isAgentTask = (value: unknown): value is AgentTask =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "agentName" in value &&
  "status" in value

// Usage
const processValue = (value: unknown): Result<string> => {
  if (!isAgentTask(value)) {
    return { ok: false, error: new Error("Not an AgentTask") }
  }
  
  // TypeScript knows value is AgentTask here
  return { ok: true, value: value.description }
}
```

---

**Next**: [07-implementation.md](./07-implementation.md) - Implementation guide

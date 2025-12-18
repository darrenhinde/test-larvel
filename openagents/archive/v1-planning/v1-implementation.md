# OpenAgents v1 - Implementation Guide

**Last Updated**: Thu Dec 18 2025  
**Estimated Time**: 8 hours

---

## 🎯 Goal

Build a **minimal, functional multi-agent plugin** in ~300 lines of new code.

---

## 📋 Implementation Checklist

### **Phase 1: Setup** (30 min)
- [ ] Update config schema (simplify)
- [ ] Update types (remove unnecessary)
- [ ] Create feature directories

### **Phase 2: Core Features** (4 hours)
- [ ] Task tracker (~50 lines)
- [ ] Context manager (~50 lines)
- [ ] UI manager (~30 lines)
- [ ] Chunker utility (~100 lines)

### **Phase 3: Integration** (2 hours)
- [ ] Update plugin entry
- [ ] Wire features together
- [ ] Handle events

### **Phase 4: Testing** (1.5 hours)
- [ ] Manual testing
- [ ] Fix bugs
- [ ] Verify all features work

---

## 🔧 Step-by-Step Implementation

### **Step 1: Update Config Schema**

**File**: `src/config/schema.ts`

```typescript
import { z } from "zod"

// Simplified agent config
const AgentConfigSchema = z.object({
  enabled: z.boolean().optional(),
  model: z.string().optional(),
  mode: z.enum(["primary", "subagent"]).optional(),
  parallel: z.boolean().optional(),
  parallel_limit: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  tools: z.record(z.boolean()).optional(),
  disabled_tools: z.array(z.string()).optional(),
  color: z.string().optional()
})

// Simplified main config
export const OpenAgentsConfigSchema = z.object({
  agents_dir: z.string().default("./agents"),
  default_model: z.string().default("opencode/big-pickle"),
  context_dir: z.string().default("./.openagents/context"),
  disabled_agents: z.array(z.string()).optional(),
  agents: z.record(AgentConfigSchema).optional()
})

export type OpenAgentsConfig = z.infer<typeof OpenAgentsConfigSchema>
export type AgentConfig = z.infer<typeof AgentConfigSchema>

// Default config
export const DEFAULT_CONFIG: OpenAgentsConfig = {
  agents_dir: "./agents",
  default_model: "opencode/big-pickle",
  context_dir: "./.openagents/context",
  agents: {}
}
```

---

### **Step 2: Create Task Tracker**

**File**: `src/features/task-tracker.ts`

```typescript
export interface Task {
  id: string
  agent: string
  sessionID: string
  status: "running" | "completed" | "error"
  startedAt: Date
  completedAt?: Date
  error?: string
}

// Pure: Generate ID
const generateId = (): string => 
  `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// Pure: Create task
const createTask = (agent: string, sessionID: string): Task => ({
  id: generateId(),
  agent,
  sessionID,
  status: "running",
  startedAt: new Date()
})

// Pure: Update task
const updateTask = (task: Task, updates: Partial<Task>): Task => ({
  ...task,
  ...updates
})

// Pure: Find task by session
const findBySession = (tasks: Map<string, Task>, sessionID: string): Task | undefined => {
  for (const task of tasks.values()) {
    if (task.sessionID === sessionID) return task
  }
  return undefined
}

// Pure: Calculate duration
const calculateDuration = (task: Task): string => {
  const end = task.completedAt || new Date()
  const ms = end.getTime() - task.startedAt.getTime()
  const seconds = Math.floor(ms / 1000)
  
  if (seconds < 60) return `${seconds}s`
  
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

// Impure: Task tracker
export const createTaskTracker = () => {
  const tasks = new Map<string, Task>()
  
  return {
    start: (agent: string, sessionID: string): Task => {
      const task = createTask(agent, sessionID)
      tasks.set(task.id, task)
      return task
    },
    
    complete: (sessionID: string): Task | undefined => {
      const task = findBySession(tasks, sessionID)
      if (!task) return undefined
      
      const updated = updateTask(task, {
        status: "completed",
        completedAt: new Date()
      })
      tasks.set(updated.id, updated)
      return updated
    },
    
    error: (sessionID: string, error: string): Task | undefined => {
      const task = findBySession(tasks, sessionID)
      if (!task) return undefined
      
      const updated = updateTask(task, {
        status: "error",
        completedAt: new Date(),
        error
      })
      tasks.set(updated.id, updated)
      return updated
    },
    
    getTasks: (): Task[] => Array.from(tasks.values()),
    
    getTask: (id: string): Task | undefined => tasks.get(id),
    
    getDuration: (task: Task): string => calculateDuration(task)
  }
}

export type TaskTracker = ReturnType<typeof createTaskTracker>
```

---

### **Step 3: Create Context Manager**

**File**: `src/features/context.ts`

```typescript
import { mkdir, writeFile, readFile, existsSync } from "node:fs"
import { join } from "node:path"
import { promisify } from "node:util"

const mkdirAsync = promisify(mkdir)
const writeFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

export interface Context {
  id: string
  createdAt: string
  data: any
}

// Pure: Create context
const createContext = (name: string, data: any): Context => ({
  id: name,
  createdAt: new Date().toISOString(),
  data
})

// Impure: Context manager
export const createContextManager = (baseDir: string) => {
  const contextDir = join(baseDir, ".openagents", "context")
  
  return {
    save: async (name: string, data: any): Promise<void> => {
      await mkdirAsync(contextDir, { recursive: true })
      
      const context = createContext(name, data)
      const path = join(contextDir, `${name}.json`)
      
      await writeFileAsync(path, JSON.stringify(context, null, 2))
    },
    
    load: async (name: string): Promise<Context | null> => {
      const path = join(contextDir, `${name}.json`)
      
      if (!existsSync(path)) return null
      
      try {
        const content = await readFileAsync(path, "utf-8")
        return JSON.parse(content)
      } catch (error) {
        console.error(`Failed to load context ${name}:`, error)
        return null
      }
    },
    
    exists: (name: string): boolean => {
      const path = join(contextDir, `${name}.json`)
      return existsSync(path)
    }
  }
}

export type ContextManager = ReturnType<typeof createContextManager>
```

---

### **Step 4: Create UI Manager**

**File**: `src/features/ui.ts`

```typescript
import type { PluginInput } from "@opencode-ai/plugin"

type Client = PluginInput["client"]

// Impure: UI manager
export const createUIManager = (client: Client) => {
  const showToast = async (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning"
  ): Promise<void> => {
    try {
      // Type assertion for tui
      const tuiClient = client as any
      if (tuiClient.tui?.showToast) {
        await tuiClient.tui.showToast({
          body: { title, message, variant, duration: 5000 }
        })
      }
    } catch (error) {
      // Silently fail - toasts are nice-to-have
      console.error("Toast failed:", error)
    }
  }
  
  return {
    showStart: async (agent: string): Promise<void> => {
      await showToast("Agent Started", `🚀 ${agent}`, "info")
    },
    
    showComplete: async (agent: string, duration: string): Promise<void> => {
      await showToast("Agent Completed", `✅ ${agent} (${duration})`, "success")
    },
    
    showError: async (agent: string, error: string): Promise<void> => {
      await showToast("Agent Failed", `❌ ${agent}: ${error}`, "error")
    }
  }
}

export type UIManager = ReturnType<typeof createUIManager>
```

---

### **Step 5: Create Chunker**

**File**: `src/utils/chunker.ts`

```typescript
// Pure: Chunk text on natural boundaries
export const chunkText = (text: string, maxSize = 3000): string[] => {
  if (text.length <= maxSize) return [text]
  
  // Try paragraph boundaries first
  const paragraphs = text.split(/\n\n+/)
  
  if (paragraphs.length === 1) {
    // No paragraphs, try sentences
    return chunkBySentences(text, maxSize)
  }
  
  return chunkByParagraphs(paragraphs, maxSize)
}

// Pure: Chunk by paragraphs
const chunkByParagraphs = (paragraphs: string[], maxSize: number): string[] => {
  const chunks: string[] = []
  let current = ""
  
  for (const para of paragraphs) {
    const separator = current ? "\n\n" : ""
    const combined = current + separator + para
    
    if (combined.length <= maxSize) {
      current = combined
    } else {
      if (current) chunks.push(current)
      
      // If single paragraph too large, split it
      if (para.length > maxSize) {
        chunks.push(...chunkBySentences(para, maxSize))
        current = ""
      } else {
        current = para
      }
    }
  }
  
  if (current) chunks.push(current)
  return chunks
}

// Pure: Chunk by sentences
const chunkBySentences = (text: string, maxSize: number): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ""
  
  for (const sentence of sentences) {
    const separator = current ? " " : ""
    const combined = current + separator + sentence
    
    if (combined.length <= maxSize) {
      current = combined
    } else {
      if (current) chunks.push(current)
      
      // If single sentence too large, hard split
      if (sentence.length > maxSize) {
        chunks.push(...hardSplit(sentence, maxSize))
        current = ""
      } else {
        current = sentence
      }
    }
  }
  
  if (current) chunks.push(current)
  return chunks
}

// Pure: Hard split (last resort)
const hardSplit = (text: string, maxSize: number): string[] => {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += maxSize) {
    chunks.push(text.slice(i, i + maxSize))
  }
  return chunks
}

// Pure: Add headers to chunks
export const addChunkHeaders = (chunks: string[]): string[] => {
  if (chunks.length === 1) return chunks
  
  return chunks.map((chunk, i) => 
    `[Part ${i + 1}/${chunks.length}]\n\n${chunk}`
  )
}

// Pure: Prepare chunked text
export const prepareChunkedText = (text: string, maxSize = 3000): string[] => {
  const chunks = chunkText(text, maxSize)
  return addChunkHeaders(chunks)
}
```

---

### **Step 6: Update Plugin Entry**

**File**: `src/plugin/index.ts`

```typescript
import type { Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { loadAgents } from "../agents/loader"
import { loadConfig } from "../config/loader"
import { createTaskTracker } from "../features/task-tracker"
import { createContextManager } from "../features/context"
import { createUIManager } from "../features/ui"

const PLUGIN_NAME = "OpenAgents"
const PLUGIN_VERSION = "0.1.0"

const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Load config
  const config = loadConfig(directory)
  
  // Create managers
  const taskTracker = createTaskTracker()
  const contextManager = createContextManager(directory)
  const uiManager = createUIManager(client)
  
  // Load agents
  const agentDirs = [
    join(directory, ".openagents", config.agents_dir),
    join(directory, ".openagents", "agents")
  ]
  
  const agentMap = loadAgents(agentDirs)
  
  // Filter disabled agents
  const disabledSet = new Set(config.disabled_agents ?? [])
  for (const name of disabledSet) {
    agentMap.delete(name)
  }
  
  // Filter by enabled: false
  if (config.agents) {
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      if (agentConfig.enabled === false) {
        agentMap.delete(name)
      }
    }
  }
  
  const agentNames = [...agentMap.keys()]
  console.log(`[${PLUGIN_NAME}] Loaded ${agentMap.size} agents: ${agentNames.join(", ")}`)
  
  return {
    /**
     * Register agents with OpenCode
     */
    config: async (openCodeConfig) => {
      const agents: Record<string, any> = {}
      
      for (const [name, agent] of agentMap) {
        const override = config.agents?.[name]
        
        // Build tools config
        let tools: Record<string, boolean> | undefined
        if (agent.disabledTools) {
          tools = {}
          for (const tool of agent.disabledTools) {
            tools[tool] = false
          }
        }
        if (override?.tools) {
          tools = { ...tools, ...override.tools }
        }
        
        agents[name] = {
          description: override?.description ?? agent.description,
          model: override?.model ?? agent.model ?? config.default_model,
          mode: override?.mode ?? agent.mode ?? "subagent",
          temperature: override?.temperature ?? agent.temperature,
          maxTokens: override?.max_tokens ?? agent.maxTokens,
          prompt: agent.prompt,
          tools,
          color: agent.color
        }
      }
      
      // Merge with existing agents
      openCodeConfig.agent = {
        ...agents,
        ...openCodeConfig.agent
      } as typeof openCodeConfig.agent
      
      console.log(`[${PLUGIN_NAME}] Registered agents: ${Object.keys(agents).join(", ")}`)
    },
    
    /**
     * Handle lifecycle events
     */
    event: async (input) => {
      const { event } = input
      
      // Session created - track task start
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string; agent?: string } } | undefined
        
        // Only track subagent sessions (have parentID)
        if (props?.info?.parentID && props?.info?.agent) {
          const sessionID = (event.properties as any).sessionID
          const agent = props.info.agent
          
          taskTracker.start(agent, sessionID)
          await uiManager.showStart(agent)
        }
      }
      
      // Session idle - track task complete
      if (event.type === "session.idle") {
        const sessionID = (event.properties as any).sessionID
        const task = taskTracker.complete(sessionID)
        
        if (task) {
          const duration = taskTracker.getDuration(task)
          await uiManager.showComplete(task.agent, duration)
        }
      }
      
      // Session error - track task error
      if (event.type === "session.error") {
        const sessionID = (event.properties as any).sessionID
        const error = (event.properties as any).error?.message || "Unknown error"
        const task = taskTracker.error(sessionID, error)
        
        if (task) {
          await uiManager.showError(task.agent, error)
        }
      }
      
      // Show toast on main session created
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string } } | undefined
        
        if (!props?.info?.parentID) {
          const agentCount = agentMap.size
          const message = agentCount > 0
            ? `Loaded ${agentCount} agents: ${agentNames.join(", ")}`
            : "No agents found"
          
          await client.tui.showToast({
            body: {
              title: `${PLUGIN_NAME} v${PLUGIN_VERSION}`,
              message,
              variant: agentCount > 0 ? "success" : "warning"
            }
          }).catch(() => {})
        }
      }
    }
  }
}

console.log(`✅ ${PLUGIN_NAME} v${PLUGIN_VERSION} loaded`)

export default OpenAgentsPlugin
```

---

### **Step 7: Export Features**

**File**: `src/features/index.ts`

```typescript
export * from "./task-tracker"
export * from "./context"
export * from "./ui"
```

**File**: `src/utils/index.ts`

```typescript
export * from "./chunker"
```

---

## 🧪 Testing

### **Manual Test Script**

1. **Start OpenCode with plugin**:
```bash
cd /Users/darrenhinde/Documents/GitHub/test-larvel/openagents
opencode --print-logs
```

2. **Verify plugin loads**:
- Check logs for "✅ OpenAgents v0.1.0 loaded"
- Check toast appears with agent count

3. **Test parallel execution** (via primary agent):
```
User: "Launch 3 researcher agents in parallel to research auth patterns"
```

4. **Verify**:
- [ ] 3 toasts show "🚀 researcher"
- [ ] 3 toasts show "✅ researcher (Xs)"
- [ ] No crashes
- [ ] Context files created in `.openagents/context/`

---

## ✅ Done Criteria

- [ ] All code compiles
- [ ] Plugin loads without errors
- [ ] Can track 3+ parallel agents
- [ ] Toasts show start/complete
- [ ] Context files save/load
- [ ] No crashes with large text
- [ ] Code is clean and readable

---

**Total Lines**: ~300 lines of new code  
**Total Time**: ~8 hours

Let's build this!

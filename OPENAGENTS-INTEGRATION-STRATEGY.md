# OpenAgents + Oh-My-OpenCode: Strategic Integration Plan

## The Critical Insight You Identified

**Oh-my-opencode's aggressive async approach burns tokens because background agents DON'T benefit from caching.**

```
Main Session (Claude):     Cache hits = 77% savings
Background Session 1:      NO cache = full price
Background Session 2:      NO cache = full price
Background Session 3:      NO cache = full price
                           ─────────────────────
Result:                    $24k burned in 2 runs
```

**OpenAgents' philosophy is fundamentally different:**
- **Context efficiency FIRST** (caching = 77% savings)
- **Async as optimization layer** (not default)
- **Customizable execution modes** (user controls the tradeoff)

---

## The Two Paradigms

### Oh-My-OpenCode: Speed-First (Expensive)
```
User Request
    ↓
Launch 3-5 background agents (parallel)
    ↓
Each agent: NEW session = NO cache = FULL PRICE
    ↓
Fast results, but $$$
```

**When this makes sense:**
- Deadline pressure (ship today)
- Exploration phase (don't know what you need)
- Multi-domain tasks (frontend + backend + docs)
- Budget is not a concern

### OpenAgents: Context-First (Efficient)
```
User Request
    ↓
Main agent with FULL context (cached)
    ↓
Sequential execution in SAME session
    ↓
Cache hits = 77% savings
    ↓
Slower, but $$
```

**When this makes sense:**
- Cost-conscious development
- Deep work in single domain
- Iterative refinement
- Long sessions (cache compounds)

---

## The OpenAgents Solution: Execution Modes

Instead of forcing one paradigm, **let users choose**:

```typescript
// .openagents/config.json
{
  "execution_mode": "balanced",  // "cache-optimized" | "speed-optimized" | "balanced"
  
  "modes": {
    "cache-optimized": {
      "description": "Maximum cost efficiency, sequential execution",
      "background_agents": false,
      "prefer_main_session": true,
      "context_strategy": "full",
      "estimated_savings": "77%"
    },
    "speed-optimized": {
      "description": "Maximum parallelism, higher cost",
      "background_agents": true,
      "parallel_limit": 3,
      "context_strategy": "minimal",
      "estimated_cost_multiplier": "3-5x"
    },
    "balanced": {
      "description": "Smart routing based on task type",
      "background_agents": "selective",
      "context_strategy": "adaptive",
      "routing_rules": {
        "exploration": "background",
        "implementation": "main_session",
        "review": "main_session"
      }
    }
  }
}
```

---

## What to Adopt from Oh-My-OpenCode

### 1. **Hook System** (Adopt Fully)
**Why**: Zero cost, massive flexibility

```typescript
// OpenAgents Hook System
interface OpenAgentsHooks {
  // Context injection (lazy, deduplicated)
  "tool.execute.after": (input, output) => void
  
  // Keyword detection (auto-mode activation)
  "chat.message": (input, output) => void
  
  // Session lifecycle (cleanup, recovery)
  "event": (event) => void
  
  // Pre-execution validation
  "tool.execute.before": (input, output) => void
}
```

**Key hooks to implement:**
- `rules-injector` - Pattern-based context injection
- `keyword-detector` - Auto-mode activation
- `session-recovery` - Error recovery
- `content-deduplicator` - Prevent duplicate injections

### 2. **Pattern-Based Context Injection** (Adopt Fully)
**Why**: 50-70% context reduction, zero cost

```markdown
<!-- .openagents/rules/typescript.md -->
---
globs: ["*.ts", "*.tsx"]
description: "TypeScript coding standards"
---
- Use strict TypeScript (no `any`)
- Prefer interfaces over types
- Use functional patterns
```

**Implementation:**
```typescript
// Only inject when file matches pattern
const shouldInject = globs.some(pattern => 
  picomatch(pattern)(filePath)
)

// Deduplicate by content hash
const hash = crypto.createHash("sha256").update(content).digest("hex")
if (!injectedHashes.has(hash)) {
  output.output += `\n\n[Rule: ${rulePath}]\n${content}`
  injectedHashes.add(hash)
}
```

### 3. **Selective Background Agents** (Adopt with Modifications)
**Why**: Speed when needed, cost control always

**Oh-my-opencode approach (aggressive):**
```typescript
// ALWAYS parallel, ALWAYS background
background_task(agent="explore", prompt="...")
background_task(agent="librarian", prompt="...")
background_task(agent="frontend", prompt="...")
// Continue immediately
```

**OpenAgents approach (selective):**
```typescript
// Route based on task type and execution mode
async function executeTask(task: Task, mode: ExecutionMode) {
  if (mode === "cache-optimized") {
    // Always use main session (cache hits)
    return await mainSession.execute(task)
  }
  
  if (mode === "speed-optimized") {
    // Always use background (parallel)
    return await backgroundAgent.launch(task)
  }
  
  // Balanced: smart routing
  if (task.type === "exploration" && task.scope === "external") {
    // External research = background (no cache benefit anyway)
    return await backgroundAgent.launch(task)
  }
  
  // Implementation = main session (cache benefits)
  return await mainSession.execute(task)
}
```

### 4. **Session Recovery** (Adopt Fully)
**Why**: Better UX, zero cost

```typescript
const RECOVERABLE_ERRORS = [
  "No tool call found for function call output",
  "Thinking block must be closed",
  "Missing tool result"
]

async function handleSessionError(sessionID: string, error: string) {
  if (RECOVERABLE_ERRORS.some(pattern => error.includes(pattern))) {
    await client.session.prompt({
      path: { id: sessionID },
      body: { parts: [{ type: "text", text: "continue" }] }
    })
  }
}
```

### 5. **Auto-Compaction** (Adopt Fully)
**Why**: Prevents session crashes, maintains cache efficiency

```typescript
// When hitting token limits
if (error.includes("maximum context length")) {
  await client.session.compact({ path: { id: sessionID } })
  // Session continues with summarized context
  // Cache still works on new messages
}
```

---

## What NOT to Adopt from Oh-My-OpenCode

### 1. **Aggressive Multi-Model Orchestration**
**Why**: Each model = new session = no cache

Oh-my-opencode uses 7 different models:
- OmO (Claude Opus)
- Oracle (GPT-5.2)
- Librarian (Claude Sonnet)
- Explore (Grok)
- Frontend (Gemini)
- Document Writer (Gemini)
- Multimodal Looker (Gemini)

**Problem**: Each model switch = new session = no cache = full price

**OpenAgents approach:**
```typescript
// Prefer single model with caching
const config = {
  primary_model: "anthropic/claude-sonnet-4",  // Main work
  fallback_model: "anthropic/claude-haiku",    // Simple tasks
  
  // Only switch models when NECESSARY
  model_routing: {
    "image_analysis": "google/gemini-2.5-flash",  // Gemini for images
    "everything_else": "primary_model"            // Stay in cache
  }
}
```

### 2. **Default Parallel Execution**
**Why**: Parallel = multiple sessions = no cache

Oh-my-opencode's OmO prompt says:
> "Explore/Librarian = fire-and-forget tools. Treat them like grep, not consultants."

**Problem**: This burns through tokens fast

**OpenAgents approach:**
```typescript
// Default to sequential (cache-friendly)
// Only parallelize when explicitly requested or in speed mode

const executionStrategy = {
  default: "sequential",  // Cache-friendly
  
  // User can override
  keywords: {
    "ultrafast": "parallel",
    "parallel": "parallel",
    "async": "parallel"
  }
}
```

### 3. **Frontend Delegation Hard Block**
**Why**: Unnecessary model switching

Oh-my-opencode ALWAYS delegates frontend to Gemini:
> "ALL frontend = DELEGATE to frontend-ui-ux-engineer. Period."

**Problem**: Forces model switch = new session = no cache

**OpenAgents approach:**
```typescript
// Let main agent handle frontend unless:
// 1. User explicitly requests specialist
// 2. Task is complex UI design (not just code)
// 3. Speed mode is enabled

const frontendRouting = {
  simple_changes: "main_agent",      // Cache-friendly
  complex_design: "specialist",       // Worth the cost
  user_requested: "specialist"        // User knows best
}
```

---

## OpenAgents Execution Mode Architecture

### Mode 1: Cache-Optimized (Default)
```
┌─────────────────────────────────────────────────────────┐
│                    MAIN SESSION                          │
│                  (Claude with Cache)                     │
│                                                          │
│  Request 1: Full context load ($0.027)                  │
│  Request 2: Cache hit ($0.006) ← 77% savings            │
│  Request 3: Cache hit ($0.006)                          │
│  Request 4: Cache hit ($0.006)                          │
│  ...                                                     │
│                                                          │
│  Total for 10 requests: ~$0.08                          │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Single session, single model
- Sequential execution
- Maximum cache utilization
- Best for: Deep work, iterative refinement, cost-conscious

### Mode 2: Speed-Optimized
```
┌─────────────────────────────────────────────────────────┐
│                    MAIN SESSION                          │
│                  (Orchestrator)                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Background 1 │  │ Background 2 │  │ Background 3 │  │
│  │ (No Cache)   │  │ (No Cache)   │  │ (No Cache)   │  │
│  │ $0.027       │  │ $0.027       │  │ $0.027       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  Total for same work: ~$0.10+ (but 3x faster)           │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Multiple parallel sessions
- No cache benefits
- Maximum speed
- Best for: Deadlines, exploration, multi-domain tasks

### Mode 3: Balanced (Smart Routing)
```
┌─────────────────────────────────────────────────────────┐
│                    MAIN SESSION                          │
│                  (Claude with Cache)                     │
│                                                          │
│  Implementation: Sequential (cache hits)                 │
│  Review: Sequential (cache hits)                         │
│  Testing: Sequential (cache hits)                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ONLY for external research (no cache anyway):    │   │
│  │                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ Librarian   │  │ Web Search  │               │   │
│  │  │ (External)  │  │ (External)  │               │   │
│  │  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Best of both: Cache where it helps, parallel where not │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Smart routing based on task type
- Cache for implementation, parallel for exploration
- Optimal cost/speed tradeoff
- Best for: Most real-world workflows

---

## Implementation Plan for OpenAgents

### Phase 1: Foundation (Week 1-2)

#### 1.1 Execution Mode System
```typescript
// src/config/execution-modes.ts
export type ExecutionMode = "cache-optimized" | "speed-optimized" | "balanced"

export interface ExecutionModeConfig {
  mode: ExecutionMode
  background_agents: boolean | "selective"
  parallel_limit: number
  context_strategy: "full" | "minimal" | "adaptive"
  routing_rules: Record<TaskType, "main_session" | "background">
}

export const DEFAULT_MODES: Record<ExecutionMode, ExecutionModeConfig> = {
  "cache-optimized": {
    mode: "cache-optimized",
    background_agents: false,
    parallel_limit: 0,
    context_strategy: "full",
    routing_rules: {
      exploration: "main_session",
      implementation: "main_session",
      review: "main_session",
      testing: "main_session"
    }
  },
  "speed-optimized": {
    mode: "speed-optimized",
    background_agents: true,
    parallel_limit: 3,
    context_strategy: "minimal",
    routing_rules: {
      exploration: "background",
      implementation: "background",
      review: "background",
      testing: "background"
    }
  },
  "balanced": {
    mode: "balanced",
    background_agents: "selective",
    parallel_limit: 2,
    context_strategy: "adaptive",
    routing_rules: {
      exploration: "background",      // No cache benefit
      implementation: "main_session", // Cache benefits
      review: "main_session",         // Cache benefits
      testing: "main_session"         // Cache benefits
    }
  }
}
```

#### 1.2 Task Router
```typescript
// src/features/task-router/index.ts
export class TaskRouter {
  constructor(private config: ExecutionModeConfig) {}
  
  async route(task: Task): Promise<TaskExecution> {
    const taskType = this.classifyTask(task)
    const destination = this.config.routing_rules[taskType]
    
    if (destination === "main_session") {
      return { type: "main_session", reason: "cache-optimized" }
    }
    
    if (destination === "background") {
      // Check parallel limit
      const runningTasks = await this.getRunningBackgroundTasks()
      if (runningTasks.length >= this.config.parallel_limit) {
        return { type: "main_session", reason: "parallel-limit-reached" }
      }
      return { type: "background", reason: "speed-optimized" }
    }
    
    return { type: "main_session", reason: "default" }
  }
  
  private classifyTask(task: Task): TaskType {
    // Classify based on task description and context
    if (task.involves_external_resources) return "exploration"
    if (task.involves_code_changes) return "implementation"
    if (task.involves_review) return "review"
    if (task.involves_testing) return "testing"
    return "implementation"
  }
}
```

### Phase 2: Hook System (Week 2-3)

#### 2.1 Hook Registry
```typescript
// src/hooks/registry.ts
export class HookRegistry {
  private hooks: Map<string, PluginHook[]> = new Map()
  
  register(name: string, hook: PluginHook) {
    const existing = this.hooks.get(name) || []
    this.hooks.set(name, [...existing, hook])
  }
  
  async execute<T extends keyof HookPoints>(
    hookPoint: T,
    input: HookPoints[T]["input"],
    output: HookPoints[T]["output"]
  ) {
    for (const [name, hooks] of this.hooks) {
      for (const hook of hooks) {
        if (hook[hookPoint]) {
          await hook[hookPoint](input, output)
        }
      }
    }
  }
}
```

#### 2.2 Rules Injector Hook
```typescript
// src/hooks/rules-injector/index.ts
export function createRulesInjectorHook(ctx: PluginContext) {
  const injectedHashes = new Map<string, Set<string>>()
  
  return {
    "tool.execute.after": async (input, output) => {
      if (!["read", "write", "edit"].includes(input.tool)) return
      
      const filePath = resolveFilePath(output.title)
      const rules = findMatchingRules(filePath)
      
      for (const rule of rules) {
        const hash = createContentHash(rule.content)
        const sessionHashes = injectedHashes.get(input.sessionID) || new Set()
        
        if (!sessionHashes.has(hash)) {
          output.output += `\n\n[Rule: ${rule.path}]\n${rule.content}`
          sessionHashes.add(hash)
          injectedHashes.set(input.sessionID, sessionHashes)
        }
      }
    }
  }
}
```

#### 2.3 Keyword Detector Hook
```typescript
// src/hooks/keyword-detector/index.ts
const KEYWORDS = {
  // Speed mode triggers
  ultrafast: { mode: "speed-optimized", message: "Switching to speed mode" },
  parallel: { mode: "speed-optimized", message: "Enabling parallel execution" },
  
  // Cache mode triggers
  efficient: { mode: "cache-optimized", message: "Optimizing for cost" },
  budget: { mode: "cache-optimized", message: "Enabling budget mode" },
  
  // Balanced mode triggers
  balanced: { mode: "balanced", message: "Using balanced execution" }
}

export function createKeywordDetectorHook() {
  return {
    "chat.message": async (input, output) => {
      const text = extractPromptText(output.parts)
      
      for (const [keyword, config] of Object.entries(KEYWORDS)) {
        if (new RegExp(`\\b${keyword}\\b`, "i").test(text)) {
          // Switch execution mode
          setExecutionMode(input.sessionID, config.mode)
          injectMessage(input.sessionID, config.message)
          break
        }
      }
    }
  }
}
```

### Phase 3: Selective Background Agents (Week 3-4)

#### 3.1 Background Agent Manager (Modified)
```typescript
// src/features/background-agent/manager.ts
export class BackgroundAgentManager {
  constructor(
    private ctx: PluginContext,
    private router: TaskRouter
  ) {}
  
  async execute(task: Task): Promise<TaskResult> {
    const routing = await this.router.route(task)
    
    if (routing.type === "main_session") {
      // Execute in main session (cache-friendly)
      return await this.executeInMainSession(task)
    }
    
    // Execute in background (parallel)
    return await this.executeInBackground(task)
  }
  
  private async executeInMainSession(task: Task): Promise<TaskResult> {
    // Use existing session = cache hits
    return await this.ctx.client.session.prompt({
      path: { id: this.ctx.sessionID },
      body: {
        parts: [{ type: "text", text: task.prompt }]
      }
    })
  }
  
  private async executeInBackground(task: Task): Promise<TaskResult> {
    // Create new session = no cache
    const session = await this.ctx.client.session.create({
      body: {
        parentID: this.ctx.sessionID,
        title: `Background: ${task.description}`
      }
    })
    
    // Non-blocking execution
    this.ctx.client.session.promptAsync({
      path: { id: session.id },
      body: {
        agent: task.agent,
        parts: [{ type: "text", text: task.prompt }]
      }
    })
    
    return { taskId: session.id, status: "running" }
  }
}
```

### Phase 4: Context Optimization (Week 4-5)

#### 4.1 Adaptive Context Strategy
```typescript
// src/features/context-strategy/index.ts
export class ContextStrategy {
  constructor(private mode: ExecutionMode) {}
  
  async loadContext(task: Task): Promise<Context> {
    switch (this.mode) {
      case "cache-optimized":
        // Full context - cache makes it cheap
        return await this.loadFullContext(task)
        
      case "speed-optimized":
        // Minimal context - each session is expensive
        return await this.loadMinimalContext(task)
        
      case "balanced":
        // Adaptive based on task type
        return await this.loadAdaptiveContext(task)
    }
  }
  
  private async loadFullContext(task: Task): Promise<Context> {
    // Load all relevant context files
    // OpenAgents' @ symbol system
    return {
      files: await this.loadAllRelevantFiles(task),
      rules: await this.loadAllMatchingRules(task),
      patterns: await this.loadCodebasePatterns(task)
    }
  }
  
  private async loadMinimalContext(task: Task): Promise<Context> {
    // Only essential context
    // 91% reduction for local models
    return {
      files: await this.loadEssentialFiles(task),
      rules: [],  // Skip rules
      patterns: [] // Skip patterns
    }
  }
  
  private async loadAdaptiveContext(task: Task): Promise<Context> {
    // Smart loading based on task
    if (task.type === "exploration") {
      return await this.loadMinimalContext(task)
    }
    return await this.loadFullContext(task)
  }
}
```

---

## Configuration Examples

### For Cost-Conscious Teams
```json
// .openagents/config.json
{
  "execution_mode": "cache-optimized",
  "model": {
    "primary": "anthropic/claude-sonnet-4",
    "fallback": "anthropic/claude-haiku"
  },
  "context": {
    "strategy": "full",
    "max_files": 4,
    "max_lines_per_file": 150
  },
  "background_agents": {
    "enabled": false
  }
}
```

### For Speed-Critical Projects
```json
// .openagents/config.json
{
  "execution_mode": "speed-optimized",
  "model": {
    "primary": "anthropic/claude-sonnet-4"
  },
  "context": {
    "strategy": "minimal"
  },
  "background_agents": {
    "enabled": true,
    "parallel_limit": 3,
    "agents": ["explore", "librarian", "tester"]
  }
}
```

### For Balanced Workflows (Recommended)
```json
// .openagents/config.json
{
  "execution_mode": "balanced",
  "model": {
    "primary": "anthropic/claude-sonnet-4"
  },
  "context": {
    "strategy": "adaptive"
  },
  "background_agents": {
    "enabled": "selective",
    "parallel_limit": 2,
    "routing": {
      "exploration": "background",
      "implementation": "main_session",
      "review": "main_session"
    }
  }
}
```

---

## Cost Comparison

### Scenario: 10-Request Development Session

| Mode | Cache Hits | Background Sessions | Estimated Cost |
|------|------------|---------------------|----------------|
| Cache-Optimized | 9/10 (90%) | 0 | ~$0.08 |
| Speed-Optimized | 0/10 (0%) | 10 | ~$0.27 |
| Balanced | 7/10 (70%) | 3 | ~$0.12 |

### Scenario: Complex Feature (50 Requests)

| Mode | Cache Hits | Background Sessions | Estimated Cost |
|------|------------|---------------------|----------------|
| Cache-Optimized | 49/50 (98%) | 0 | ~$0.32 |
| Speed-Optimized | 0/50 (0%) | 50 | ~$1.35 |
| Balanced | 40/50 (80%) | 10 | ~$0.50 |

**Key Insight**: Cache-optimized mode is **4x cheaper** than speed-optimized for long sessions.

---

## Summary: What OpenAgents Should Be

### Core Philosophy
1. **Context efficiency first** - Caching is the secret weapon
2. **Async as optimization** - Not the default
3. **User controls the tradeoff** - Execution modes
4. **Smart routing** - Right tool for the job

### From Oh-My-OpenCode: Adopt
- Hook system (zero cost, massive flexibility)
- Pattern-based context injection (50-70% reduction)
- Session recovery (better UX)
- Auto-compaction (prevents crashes)
- Keyword detection (auto-mode switching)

### From Oh-My-OpenCode: Modify
- Background agents (selective, not default)
- Multi-model (minimize switching)
- Parallel execution (only when beneficial)

### From Oh-My-OpenCode: Skip
- Aggressive multi-model orchestration
- Default parallel execution
- Hard delegation rules

### Unique to OpenAgents
- Execution modes (cache/speed/balanced)
- Smart task routing
- Adaptive context strategy
- Cost-aware decision making
- @ symbol context loading (your innovation)

---

## Next Steps

1. **Implement execution mode system** (foundation)
2. **Add hook registry** (extensibility)
3. **Create task router** (smart routing)
4. **Build rules injector** (context efficiency)
5. **Add keyword detector** (auto-mode)
6. **Implement selective background agents** (speed when needed)

**Start with cache-optimized as default, let users opt into speed when needed.**

This approach gives you the best of both worlds:
- **Oh-my-opencode's flexibility** (hooks, patterns, recovery)
- **OpenAgents' efficiency** (caching, context optimization)
- **User control** (execution modes)

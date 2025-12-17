# OpenAgents: Modular Architecture Plan

## Design Principles

1. **Transparent** - Nothing hidden, everything visible in config
2. **Opt-in/Opt-out** - Every feature can be enabled/disabled
3. **Modular** - Each feature is independent
4. **Hierarchical** - Clear plugin priority (last runs last = highest priority)
5. **Simple** - Easy to understand, easy to use
6. **Customizable** - Users control async, caching, agents

---

## Part 1: Plugin Hierarchy System

### The Problem
When multiple plugins provide the same hook/tool/agent, which one wins?

### The Solution: Priority-Based Hierarchy

```
Plugin Load Order (from opencode.json):
┌─────────────────────────────────────────────────────────┐
│  "plugins": [                                           │
│    "openagents-core",      // Priority 1 (runs first)  │
│    "openagents-context",   // Priority 2               │
│    "openagents-async",     // Priority 3               │
│    "my-custom-plugin"      // Priority 4 (runs last)   │
│  ]                                                      │
└─────────────────────────────────────────────────────────┘

Execution Order:
┌─────────────────────────────────────────────────────────┐
│  HOOKS (tool.execute.before):                           │
│    1. openagents-core.before()      ← runs first       │
│    2. openagents-context.before()                       │
│    3. openagents-async.before()                         │
│    4. my-custom-plugin.before()     ← runs last        │
│                                                          │
│  HOOKS (tool.execute.after):                            │
│    1. my-custom-plugin.after()      ← runs first       │
│    2. openagents-async.after()                          │
│    3. openagents-context.after()                        │
│    4. openagents-core.after()       ← runs last        │
│                                                          │
│  TOOLS/AGENTS (same name):                              │
│    → Last plugin wins (highest priority)                │
└─────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/core/plugin-registry.ts

export interface PluginRegistration {
  name: string
  priority: number  // Higher = runs later for before hooks, first for after hooks
  hooks: PluginHooks
  tools: Record<string, Tool>
  agents: Record<string, AgentConfig>
  features: Record<string, FeatureConfig>
}

export class PluginRegistry {
  private plugins: PluginRegistration[] = []
  
  register(plugin: PluginRegistration) {
    this.plugins.push(plugin)
    // Sort by priority (ascending)
    this.plugins.sort((a, b) => a.priority - b.priority)
  }
  
  // For "before" hooks: run in priority order (low to high)
  async executeBeforeHooks(hookName: string, input: any, output: any) {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks[`${hookName}.before`]
      if (hook) {
        await hook(input, output)
      }
    }
  }
  
  // For "after" hooks: run in REVERSE priority order (high to low)
  async executeAfterHooks(hookName: string, input: any, output: any) {
    for (const plugin of [...this.plugins].reverse()) {
      const hook = plugin.hooks[`${hookName}.after`]
      if (hook) {
        await hook(input, output)
      }
    }
  }
  
  // For tools/agents: last plugin wins
  getTools(): Record<string, Tool> {
    const tools: Record<string, Tool> = {}
    for (const plugin of this.plugins) {
      Object.assign(tools, plugin.tools)  // Later plugins override
    }
    return tools
  }
  
  getAgents(): Record<string, AgentConfig> {
    const agents: Record<string, AgentConfig> = {}
    for (const plugin of this.plugins) {
      Object.assign(agents, plugin.agents)  // Later plugins override
    }
    return agents
  }
}
```

### User-Facing Config

```json
// .openagents/config.json
{
  "plugins": {
    "order": [
      "openagents-core",
      "openagents-context", 
      "openagents-async",
      "my-custom-plugin"
    ],
    
    "overrides": {
      "my-custom-plugin": {
        "priority": 100  // Force to run last
      }
    }
  }
}
```

### Visual Feedback (Transparency)

```bash
$ openagents plugins list

Plugin Hierarchy (execution order):
┌────┬─────────────────────┬──────────┬─────────────────────────┐
│ #  │ Plugin              │ Priority │ Features                │
├────┼─────────────────────┼──────────┼─────────────────────────┤
│ 1  │ openagents-core     │ 10       │ hooks, tools, agents    │
│ 2  │ openagents-context  │ 20       │ rules-injector, dedup   │
│ 3  │ openagents-async    │ 30       │ background-agents       │
│ 4  │ my-custom-plugin    │ 100      │ custom-tool             │
└────┴─────────────────────┴──────────┴─────────────────────────┘

Hook Execution Order:
  before: core → context → async → custom
  after:  custom → async → context → core

Tool/Agent Conflicts:
  "explore" agent: defined by [core, context] → using context (priority 20)
```

---

## Part 2: Transparent Opt-In/Opt-Out System

### Design Philosophy
- **Everything visible** in one config file
- **Sensible defaults** that work out of the box
- **Easy overrides** without editing code
- **Clear documentation** of what each feature does

### The Master Config File

```json
// .openagents/config.json
{
  "$schema": "https://openagents.dev/schema/config.json",
  
  // =========================================================================
  // EXECUTION MODE
  // Controls how agents execute tasks (caching vs speed tradeoff)
  // =========================================================================
  "execution": {
    "mode": "balanced",  // "cache-optimized" | "speed-optimized" | "balanced"
    
    "modes": {
      "cache-optimized": {
        "description": "Maximum cost efficiency, sequential execution",
        "background_agents": false,
        "prefer_main_session": true
      },
      "speed-optimized": {
        "description": "Maximum parallelism, higher cost", 
        "background_agents": true,
        "parallel_limit": 3
      },
      "balanced": {
        "description": "Smart routing based on task type",
        "background_agents": "selective",
        "parallel_limit": 2
      }
    }
  },
  
  // =========================================================================
  // FEATURES
  // Each feature can be enabled/disabled independently
  // =========================================================================
  "features": {
    // Context Injection Features
    "rules-injector": {
      "enabled": true,
      "description": "Injects context rules based on file patterns",
      "config": {
        "rules_dir": ".openagents/rules",
        "deduplicate": true
      }
    },
    
    "directory-context": {
      "enabled": true,
      "description": "Injects AGENTS.md and README.md from directories",
      "config": {
        "files": ["AGENTS.md", "README.md"],
        "walk_up": true
      }
    },
    
    // Keyword Detection
    "keyword-detector": {
      "enabled": true,
      "description": "Detects keywords to auto-switch execution modes",
      "config": {
        "keywords": {
          "ultrafast": { "mode": "speed-optimized" },
          "parallel": { "mode": "speed-optimized" },
          "efficient": { "mode": "cache-optimized" },
          "budget": { "mode": "cache-optimized" }
        }
      }
    },
    
    // Session Management
    "session-recovery": {
      "enabled": true,
      "description": "Auto-recovers from common session errors"
    },
    
    "auto-compact": {
      "enabled": true,
      "description": "Auto-compacts session when hitting token limits"
    },
    
    // Output Processing
    "content-deduplication": {
      "enabled": true,
      "description": "Prevents duplicate context injections"
    },
    
    "output-truncation": {
      "enabled": true,
      "description": "Truncates large outputs to preserve context window",
      "config": {
        "max_tokens": 50000,
        "preserve_ratio": 0.5
      }
    }
  },
  
  // =========================================================================
  // AGENTS
  // Configure built-in and custom agents
  // =========================================================================
  "agents": {
    // Built-in agents (can be disabled or overridden)
    "openagent": {
      "enabled": true,
      "model": "anthropic/claude-sonnet-4",
      "async": false,  // Main agent always sync
      "description": "Universal coordinator"
    },
    
    "opencoder": {
      "enabled": true,
      "model": "anthropic/claude-sonnet-4",
      "async": false,
      "description": "Complex coding specialist"
    },
    
    "task-manager": {
      "enabled": true,
      "model": "anthropic/claude-sonnet-4",
      "async": false,
      "mode": "subagent",
      "description": "Planning & breakdown"
    },
    
    "coder-agent": {
      "enabled": true,
      "model": "anthropic/claude-sonnet-4",
      "async": true,  // Can run in background
      "mode": "subagent",
      "description": "Quick implementation"
    },
    
    "tester": {
      "enabled": true,
      "model": "anthropic/claude-sonnet-4",
      "async": true,  // Can run in background
      "mode": "subagent",
      "description": "Test creation"
    },
    
    "reviewer": {
      "enabled": true,
      "model": "anthropic/claude-sonnet-4",
      "async": true,  // Can run in background
      "mode": "subagent",
      "description": "Code review"
    },
    
    // Custom agents (user-defined)
    "my-custom-agent": {
      "enabled": true,
      "model": "anthropic/claude-haiku",
      "async": true,
      "mode": "subagent",
      "prompt": "You are a custom agent...",
      "description": "My custom helper"
    }
  },
  
  // =========================================================================
  // HOOKS
  // Enable/disable specific hooks
  // =========================================================================
  "hooks": {
    "tool.execute.before": {
      "logging": true,
      "validation": true,
      "context-injection": true
    },
    "tool.execute.after": {
      "logging": true,
      "output-processing": true,
      "deduplication": true
    },
    "chat.message": {
      "keyword-detection": true
    },
    "session.error": {
      "auto-recovery": true
    }
  },
  
  // =========================================================================
  // TOOLS
  // Enable/disable specific tools
  // =========================================================================
  "tools": {
    "background_task": {
      "enabled": true,
      "description": "Launch agents in background"
    },
    "background_output": {
      "enabled": true,
      "description": "Get background task results"
    },
    "background_cancel": {
      "enabled": true,
      "description": "Cancel background tasks"
    }
  }
}
```

### Feature Toggle Implementation

```typescript
// src/core/feature-manager.ts

export interface FeatureConfig {
  enabled: boolean
  description: string
  config?: Record<string, any>
}

export class FeatureManager {
  private features: Map<string, FeatureConfig> = new Map()
  
  constructor(config: Record<string, FeatureConfig>) {
    for (const [name, featureConfig] of Object.entries(config)) {
      this.features.set(name, featureConfig)
    }
  }
  
  isEnabled(featureName: string): boolean {
    const feature = this.features.get(featureName)
    return feature?.enabled ?? false
  }
  
  getConfig<T>(featureName: string): T | undefined {
    const feature = this.features.get(featureName)
    return feature?.config as T | undefined
  }
  
  // For transparency: list all features and their status
  listFeatures(): FeatureStatus[] {
    return Array.from(this.features.entries()).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      description: config.description
    }))
  }
}

// Usage in hooks
export function createRulesInjectorHook(ctx: PluginContext) {
  return {
    "tool.execute.after": async (input, output) => {
      // Check if feature is enabled
      if (!ctx.features.isEnabled("rules-injector")) {
        return  // Skip if disabled
      }
      
      // Feature is enabled, proceed
      const config = ctx.features.getConfig<RulesInjectorConfig>("rules-injector")
      // ... implementation
    }
  }
}
```

### CLI Commands for Transparency

```bash
# List all features and their status
$ openagents features list

OpenAgents Features:
┌─────────────────────────┬─────────┬────────────────────────────────────────┐
│ Feature                 │ Status  │ Description                            │
├─────────────────────────┼─────────┼────────────────────────────────────────┤
│ rules-injector          │ ✅ ON   │ Injects context rules based on files   │
│ directory-context       │ ✅ ON   │ Injects AGENTS.md from directories     │
│ keyword-detector        │ ✅ ON   │ Auto-switches execution modes          │
│ session-recovery        │ ✅ ON   │ Auto-recovers from session errors      │
│ auto-compact            │ ✅ ON   │ Auto-compacts on token limits          │
│ content-deduplication   │ ✅ ON   │ Prevents duplicate injections          │
│ output-truncation       │ ✅ ON   │ Truncates large outputs                │
└─────────────────────────┴─────────┴────────────────────────────────────────┘

# Toggle a feature
$ openagents features disable rules-injector
✅ Disabled: rules-injector

$ openagents features enable rules-injector
✅ Enabled: rules-injector

# Show feature details
$ openagents features show rules-injector

Feature: rules-injector
Status: ✅ Enabled
Description: Injects context rules based on file patterns

Configuration:
  rules_dir: .openagents/rules
  deduplicate: true

Hooks Used:
  - tool.execute.after

Files:
  - .openagents/rules/*.md (glob patterns in frontmatter)
```

---

## Part 3: Async Execution Settings for Custom Agents

### The Problem
Users want to control which agents can run in background (async) vs. must run in main session (sync).

### The Solution: Per-Agent Async Configuration

```json
// .openagents/config.json
{
  "agents": {
    // Main agents - NEVER async (need cache benefits)
    "openagent": {
      "enabled": true,
      "async": false,  // Always in main session
      "async_allowed": false  // Cannot be overridden
    },
    
    // Subagents - configurable async
    "coder-agent": {
      "enabled": true,
      "async": true,  // Default: can run in background
      "async_allowed": true,  // Can be changed by user
      "async_conditions": {
        "execution_mode": ["speed-optimized", "balanced"],
        "task_type": ["implementation", "testing"]
      }
    },
    
    "tester": {
      "enabled": true,
      "async": true,
      "async_allowed": true
    },
    
    "reviewer": {
      "enabled": true,
      "async": false,  // Default: sync (review needs context)
      "async_allowed": true  // But user can enable async
    },
    
    // Custom agent with full async control
    "my-research-agent": {
      "enabled": true,
      "model": "anthropic/claude-haiku",
      "async": true,
      "async_allowed": true,
      "async_conditions": {
        "execution_mode": ["speed-optimized"],
        "keywords": ["research", "explore", "find"]
      }
    }
  },
  
  // Global async settings
  "async": {
    "enabled": true,  // Master switch for all async
    "parallel_limit": 3,
    "timeout_ms": 300000,  // 5 minutes
    "notification": {
      "on_complete": true,
      "on_error": true,
      "toast": true
    }
  }
}
```

### Async Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ASYNC DECISION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

User Request: "Run tests for auth module"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 1: Check Global Async Setting                                       │
│         async.enabled = true? ──────────────────────────────────────────│
│              │                                                           │
│         NO   │   YES                                                     │
│              │    │                                                      │
│              ▼    ▼                                                      │
│         SYNC    Continue                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 2: Check Agent Async Setting                                        │
│         agent.async_allowed = true? ────────────────────────────────────│
│              │                                                           │
│         NO   │   YES                                                     │
│              │    │                                                      │
│              ▼    ▼                                                      │
│         SYNC    Continue                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 3: Check Execution Mode                                             │
│         execution.mode in agent.async_conditions.execution_mode? ───────│
│              │                                                           │
│         NO   │   YES                                                     │
│              │    │                                                      │
│              ▼    ▼                                                      │
│         SYNC    Continue                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 4: Check Parallel Limit                                             │
│         running_tasks < async.parallel_limit? ──────────────────────────│
│              │                                                           │
│         NO   │   YES                                                     │
│              │    │                                                      │
│              ▼    ▼                                                      │
│         SYNC    ASYNC                                                    │
│         (queue) (launch background)                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/core/async-manager.ts

export interface AsyncConfig {
  enabled: boolean
  parallel_limit: number
  timeout_ms: number
  notification: {
    on_complete: boolean
    on_error: boolean
    toast: boolean
  }
}

export interface AgentAsyncConfig {
  async: boolean
  async_allowed: boolean
  async_conditions?: {
    execution_mode?: string[]
    task_type?: string[]
    keywords?: string[]
  }
}

export class AsyncManager {
  private runningTasks: Map<string, BackgroundTask> = new Map()
  
  constructor(
    private globalConfig: AsyncConfig,
    private agentConfigs: Record<string, AgentAsyncConfig>,
    private executionMode: string
  ) {}
  
  shouldRunAsync(agentName: string, taskContext: TaskContext): AsyncDecision {
    // Step 1: Global async check
    if (!this.globalConfig.enabled) {
      return { async: false, reason: "Global async disabled" }
    }
    
    // Step 2: Agent async_allowed check
    const agentConfig = this.agentConfigs[agentName]
    if (!agentConfig?.async_allowed) {
      return { async: false, reason: `Agent ${agentName} does not allow async` }
    }
    
    // Step 3: Agent async default check
    if (!agentConfig.async) {
      return { async: false, reason: `Agent ${agentName} async disabled by default` }
    }
    
    // Step 4: Execution mode check
    const conditions = agentConfig.async_conditions
    if (conditions?.execution_mode) {
      if (!conditions.execution_mode.includes(this.executionMode)) {
        return { 
          async: false, 
          reason: `Execution mode ${this.executionMode} not in allowed modes` 
        }
      }
    }
    
    // Step 5: Task type check
    if (conditions?.task_type) {
      if (!conditions.task_type.includes(taskContext.type)) {
        return { 
          async: false, 
          reason: `Task type ${taskContext.type} not in allowed types` 
        }
      }
    }
    
    // Step 6: Parallel limit check
    if (this.runningTasks.size >= this.globalConfig.parallel_limit) {
      return { 
        async: false, 
        reason: `Parallel limit reached (${this.runningTasks.size}/${this.globalConfig.parallel_limit})` 
      }
    }
    
    // All checks passed
    return { async: true, reason: "All conditions met" }
  }
  
  async launchAsync(
    agentName: string, 
    task: Task, 
    ctx: PluginContext
  ): Promise<BackgroundTask> {
    const session = await ctx.client.session.create({
      body: {
        parentID: ctx.sessionID,
        title: `Background: ${task.description}`
      }
    })
    
    const backgroundTask: BackgroundTask = {
      id: `bg_${crypto.randomUUID().slice(0, 8)}`,
      sessionID: session.id,
      agentName,
      task,
      status: "running",
      startedAt: new Date()
    }
    
    this.runningTasks.set(backgroundTask.id, backgroundTask)
    
    // Non-blocking execution
    ctx.client.session.promptAsync({
      path: { id: session.id },
      body: {
        agent: agentName,
        parts: [{ type: "text", text: task.prompt }]
      }
    }).catch(error => {
      backgroundTask.status = "error"
      backgroundTask.error = error.message
      this.notifyError(backgroundTask)
    })
    
    return backgroundTask
  }
}
```

### User-Facing Async Control

```bash
# View async status
$ openagents async status

Async Execution Status:
┌─────────────────────────────────────────────────────────────────────────┐
│ Global: ✅ Enabled                                                       │
│ Parallel Limit: 3                                                        │
│ Running Tasks: 1/3                                                       │
└─────────────────────────────────────────────────────────────────────────┘

Agent Async Settings:
┌─────────────────────┬─────────┬─────────────┬────────────────────────────┐
│ Agent               │ Async   │ Allowed     │ Conditions                 │
├─────────────────────┼─────────┼─────────────┼────────────────────────────┤
│ openagent           │ ❌ OFF  │ ❌ NO       │ Main agent (never async)   │
│ opencoder           │ ❌ OFF  │ ❌ NO       │ Main agent (never async)   │
│ task-manager        │ ❌ OFF  │ ✅ YES      │ Planning needs context     │
│ coder-agent         │ ✅ ON   │ ✅ YES      │ speed/balanced modes       │
│ tester              │ ✅ ON   │ ✅ YES      │ speed/balanced modes       │
│ reviewer            │ ❌ OFF  │ ✅ YES      │ Review needs context       │
│ my-research-agent   │ ✅ ON   │ ✅ YES      │ speed mode only            │
└─────────────────────┴─────────┴─────────────┴────────────────────────────┘

Running Background Tasks:
┌────────────────┬─────────────────┬──────────┬────────────┐
│ Task ID        │ Agent           │ Status   │ Duration   │
├────────────────┼─────────────────┼──────────┼────────────┤
│ bg_a1b2c3d4    │ tester          │ running  │ 45s        │
└────────────────┴─────────────────┴──────────┴────────────┘

# Toggle agent async
$ openagents async enable reviewer
✅ Enabled async for: reviewer

$ openagents async disable coder-agent
✅ Disabled async for: coder-agent

# Set parallel limit
$ openagents async limit 5
✅ Parallel limit set to: 5
```

---

## Part 4: Modular File Structure

### Directory Layout

```
openagents/
├── packages/
│   ├── core/                          # Core plugin (always loaded)
│   │   ├── src/
│   │   │   ├── index.ts               # Plugin entry point
│   │   │   ├── plugin-registry.ts     # Plugin hierarchy management
│   │   │   ├── feature-manager.ts     # Feature toggle system
│   │   │   ├── config-loader.ts       # Config file loading
│   │   │   └── types.ts               # Shared types
│   │   └── package.json
│   │
│   ├── context/                       # Context injection plugin
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── features/
│   │   │   │   ├── rules-injector.ts
│   │   │   │   ├── directory-context.ts
│   │   │   │   └── content-dedup.ts
│   │   │   └── hooks/
│   │   │       └── tool-execute-after.ts
│   │   └── package.json
│   │
│   ├── async/                         # Async execution plugin
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── async-manager.ts
│   │   │   ├── background-task.ts
│   │   │   └── tools/
│   │   │       ├── background-task.ts
│   │   │       ├── background-output.ts
│   │   │       └── background-cancel.ts
│   │   └── package.json
│   │
│   ├── recovery/                      # Session recovery plugin
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── session-recovery.ts
│   │   │   └── auto-compact.ts
│   │   └── package.json
│   │
│   └── agents/                        # Built-in agents plugin
│       ├── src/
│       │   ├── index.ts
│       │   ├── agents/
│       │   │   ├── openagent.ts
│       │   │   ├── opencoder.ts
│       │   │   ├── task-manager.ts
│       │   │   ├── coder-agent.ts
│       │   │   ├── tester.ts
│       │   │   └── reviewer.ts
│       │   └── utils/
│       │       └── agent-factory.ts
│       └── package.json
│
├── .openagents/                       # User configuration
│   ├── config.json                    # Master config file
│   ├── rules/                         # Context rules
│   │   ├── typescript.md
│   │   ├── python.md
│   │   └── testing.md
│   └── agents/                        # Custom agent definitions
│       └── my-custom-agent.md
│
└── docs/
    ├── configuration.md               # Config documentation
    ├── plugins.md                     # Plugin system docs
    ├── async.md                       # Async execution docs
    └── features.md                    # Feature reference
```

### Package Dependencies

```json
// packages/core/package.json
{
  "name": "@openagents/core",
  "version": "1.0.0",
  "dependencies": {
    "@opencode-ai/plugin": "^1.0.162",
    "zod": "^4.1.8"
  }
}

// packages/context/package.json
{
  "name": "@openagents/context",
  "version": "1.0.0",
  "dependencies": {
    "@openagents/core": "^1.0.0",
    "picomatch": "^4.0.2"
  }
}

// packages/async/package.json
{
  "name": "@openagents/async",
  "version": "1.0.0",
  "dependencies": {
    "@openagents/core": "^1.0.0"
  }
}
```

### Monorepo Setup

```json
// package.json (root)
{
  "name": "openagents",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test"
  }
}
```

---

## Part 5: User Experience Design

### First-Time Setup

```bash
$ openagents init

Welcome to OpenAgents! 🚀

Let's set up your configuration...

? Execution mode:
  ❯ balanced (recommended) - Smart routing, good cost/speed balance
    cache-optimized - Maximum cost efficiency, sequential execution
    speed-optimized - Maximum parallelism, higher cost

? Enable background agents?
  ❯ Yes (selective) - Only for exploration tasks
    Yes (all) - For all compatible agents
    No - Always use main session

? Enable context injection?
  ❯ Yes - Inject rules and AGENTS.md automatically
    No - Manual context only

? Enable session recovery?
  ❯ Yes - Auto-recover from errors
    No - Manual recovery

Creating .openagents/config.json...
✅ Configuration created!

Next steps:
  1. Review your config: cat .openagents/config.json
  2. Add context rules: .openagents/rules/
  3. Start coding: opencode

Run 'openagents help' for more commands.
```

### Config Validation

```bash
$ openagents config validate

Validating .openagents/config.json...

✅ Schema valid
✅ All referenced plugins found
✅ Agent configurations valid
✅ Feature configurations valid

Warnings:
  ⚠️  Agent 'my-custom-agent' has async=true but no async_conditions
      Consider adding conditions to control when async is used

Summary:
  Plugins: 4 loaded
  Agents: 8 configured (6 enabled)
  Features: 7 configured (7 enabled)
  Hooks: 12 registered
```

### Runtime Status

```bash
$ openagents status

OpenAgents Status
═══════════════════════════════════════════════════════════════════════════

Execution Mode: balanced
  Background agents: selective
  Parallel limit: 2/3 used

Plugins (4 loaded):
  1. @openagents/core (v1.0.0) - priority 10
  2. @openagents/context (v1.0.0) - priority 20
  3. @openagents/async (v1.0.0) - priority 30
  4. @openagents/agents (v1.0.0) - priority 40

Features:
  ✅ rules-injector
  ✅ directory-context
  ✅ keyword-detector
  ✅ session-recovery
  ✅ auto-compact
  ✅ content-deduplication
  ✅ output-truncation

Agents:
  Primary: openagent, opencoder
  Subagents: task-manager, coder-agent, tester, reviewer
  Custom: my-custom-agent

Background Tasks:
  Running: 2
  Completed: 5
  Failed: 0

Session:
  Cache hits: 87%
  Estimated savings: $0.42
```

---

## Part 6: Implementation Roadmap

### Phase 1: Core Foundation (Week 1-2)

**Goal**: Basic plugin system with hierarchy and config loading

```typescript
// Deliverables:
// 1. PluginRegistry class
// 2. ConfigLoader with schema validation
// 3. FeatureManager with toggle system
// 4. Basic CLI commands (init, status, validate)
```

**Tasks**:
- [ ] Create `@openagents/core` package
- [ ] Implement PluginRegistry with priority system
- [ ] Implement ConfigLoader with Zod schema
- [ ] Implement FeatureManager
- [ ] Create CLI scaffolding
- [ ] Write tests for core functionality

### Phase 2: Context System (Week 2-3)

**Goal**: Pattern-based context injection with deduplication

```typescript
// Deliverables:
// 1. Rules injector hook
// 2. Directory context hook
// 3. Content deduplication
// 4. Rules file format (.md with frontmatter)
```

**Tasks**:
- [ ] Create `@openagents/context` package
- [ ] Implement rules-injector feature
- [ ] Implement directory-context feature
- [ ] Implement content-deduplication feature
- [ ] Create example rules files
- [ ] Write tests for context injection

### Phase 3: Async System (Week 3-4)

**Goal**: Selective background agent execution

```typescript
// Deliverables:
// 1. AsyncManager class
// 2. Background task tools
// 3. Per-agent async configuration
// 4. Notification system
```

**Tasks**:
- [ ] Create `@openagents/async` package
- [ ] Implement AsyncManager with decision flow
- [ ] Implement background_task tool
- [ ] Implement background_output tool
- [ ] Implement background_cancel tool
- [ ] Add notification system
- [ ] Write tests for async execution

### Phase 4: Recovery System (Week 4-5)

**Goal**: Automatic error recovery and session management

```typescript
// Deliverables:
// 1. Session recovery hook
// 2. Auto-compact hook
// 3. Error pattern detection
```

**Tasks**:
- [ ] Create `@openagents/recovery` package
- [ ] Implement session-recovery feature
- [ ] Implement auto-compact feature
- [ ] Add error pattern detection
- [ ] Write tests for recovery

### Phase 5: Agents Package (Week 5-6)

**Goal**: Built-in agents with configurable async

```typescript
// Deliverables:
// 1. All built-in agents
// 2. Agent factory with config merging
// 3. Custom agent loading
```

**Tasks**:
- [ ] Create `@openagents/agents` package
- [ ] Implement all built-in agents
- [ ] Implement agent factory
- [ ] Add custom agent loading from .openagents/agents/
- [ ] Write tests for agents

### Phase 6: Polish & Documentation (Week 6-7)

**Goal**: Complete CLI, documentation, and examples

**Tasks**:
- [ ] Complete all CLI commands
- [ ] Write comprehensive documentation
- [ ] Create example configurations
- [ ] Create tutorial/getting started guide
- [ ] Performance testing
- [ ] Security review

---

## Part 7: Config Schema Reference

### Complete Schema

```typescript
// src/core/schema.ts
import { z } from "zod"

// Execution Mode Schema
const ExecutionModeSchema = z.enum([
  "cache-optimized",
  "speed-optimized", 
  "balanced"
])

const ExecutionConfigSchema = z.object({
  mode: ExecutionModeSchema.default("balanced"),
  modes: z.record(z.object({
    description: z.string(),
    background_agents: z.union([z.boolean(), z.literal("selective")]),
    prefer_main_session: z.boolean().optional(),
    parallel_limit: z.number().optional()
  })).optional()
})

// Feature Schema
const FeatureConfigSchema = z.object({
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  config: z.record(z.any()).optional()
})

// Agent Schema
const AgentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  model: z.string().optional(),
  async: z.boolean().default(false),
  async_allowed: z.boolean().default(true),
  async_conditions: z.object({
    execution_mode: z.array(z.string()).optional(),
    task_type: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  mode: z.enum(["primary", "subagent"]).optional(),
  prompt: z.string().optional(),
  description: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  tools: z.record(z.boolean()).optional()
})

// Async Schema
const AsyncConfigSchema = z.object({
  enabled: z.boolean().default(true),
  parallel_limit: z.number().default(3),
  timeout_ms: z.number().default(300000),
  notification: z.object({
    on_complete: z.boolean().default(true),
    on_error: z.boolean().default(true),
    toast: z.boolean().default(true)
  }).optional()
})

// Plugin Schema
const PluginConfigSchema = z.object({
  order: z.array(z.string()).optional(),
  overrides: z.record(z.object({
    priority: z.number().optional(),
    enabled: z.boolean().optional()
  })).optional()
})

// Hooks Schema
const HooksConfigSchema = z.record(z.record(z.boolean()))

// Tools Schema
const ToolsConfigSchema = z.record(z.object({
  enabled: z.boolean().default(true),
  description: z.string().optional()
}))

// Master Config Schema
export const OpenAgentsConfigSchema = z.object({
  $schema: z.string().optional(),
  execution: ExecutionConfigSchema.optional(),
  features: z.record(FeatureConfigSchema).optional(),
  agents: z.record(AgentConfigSchema).optional(),
  async: AsyncConfigSchema.optional(),
  plugins: PluginConfigSchema.optional(),
  hooks: HooksConfigSchema.optional(),
  tools: ToolsConfigSchema.optional()
})

export type OpenAgentsConfig = z.infer<typeof OpenAgentsConfigSchema>
```

---

## Summary

### Key Design Decisions

1. **Plugin Hierarchy**: Last plugin in list runs last (highest priority for overrides)
2. **Feature Toggles**: Every feature can be enabled/disabled in config
3. **Async Control**: Per-agent async settings with conditions
4. **Transparency**: CLI commands show exactly what's happening
5. **Modularity**: Each feature is a separate package

### What Users Get

1. **Simple defaults** that work out of the box
2. **Full control** when they need it
3. **Clear visibility** into what's happening
4. **Easy customization** without code changes
5. **Predictable behavior** based on config

### What Developers Get

1. **Clean architecture** with clear separation
2. **Easy to extend** with new plugins
3. **Testable modules** with single responsibilities
4. **Type-safe config** with Zod validation
5. **Documented patterns** for consistency

### Next Steps

1. **Review this plan** - Does it meet your requirements?
2. **Prioritize features** - What's most important first?
3. **Start implementation** - Begin with Phase 1 (Core Foundation)
4. **Iterate** - Adjust based on feedback

---

**Ready to start implementing? Let me know which phase to begin with!**

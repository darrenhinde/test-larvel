# Agent Integration with Workflows

## Overview

This document explains how OpenAgents integrates with the workflow system, how agents are discovered and loaded, and how to configure them for both global and project-specific use.

## Agent Discovery & Loading

### How Agents Are Loaded

OpenAgents uses a **multi-directory loading system** that supports both global and project-local agents:

```typescript
// From src/index.ts
const agentDirs = [
  join(directory, ".openagents", config.agents_dir),  // Configured directory
  join(directory, ".openagents", "agents"),           // Default directory
]

const agentMap = loadAgents(agentDirs)
```

### Agent File Format

Agents are defined as **Markdown files** (`.md` or `.mdc`) with optional YAML frontmatter:

```markdown
---
description: "A helpful planning agent"
model: "anthropic/claude-sonnet-4"
mode: "subagent"
temperature: 0.7
maxTokens: 4000
tools: ["read", "write", "bash"]
disabledTools: ["webfetch"]
color: "#3B82F6"
---

You are a planning agent specialized in breaking down complex tasks.

Your responsibilities:
- Analyze requirements
- Create step-by-step plans
- Identify dependencies
- Estimate effort

Always provide clear, actionable plans.
```

### Agent Definition Structure

```typescript
interface AgentDefinition {
  name: string              // Derived from filename (e.g., "planner.md" → "planner")
  path: string              // Full path to .md file
  prompt: string            // Agent instructions (markdown body)
  description?: string      // Human-readable description
  model?: string            // LLM model to use
  mode?: "primary" | "subagent"
  temperature?: number      // 0-2, controls randomness
  maxTokens?: number        // Max response length
  tools?: string[]          // Enabled tools
  disabledTools?: string[]  // Disabled tools
  color?: string            // UI color (hex)
}
```

## Configuration System

### Config File Locations

OpenAgents searches for config in this order:

1. `.openagents/config.json` (recommended)
2. `.openagents.json`
3. `openagents.json`

### Config Schema

```json
{
  "$schema": "https://raw.githubusercontent.com/openagents/openagents/main/schema.json",
  "enabled": true,
  "agents_dir": "./agents",
  "default_model": "anthropic/claude-sonnet-4",
  "context_dir": "./.openagents/context",
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)",
  "default_visible_to": ["plan", "build"],
  "show_version_popup": true,
  "disabled_agents": ["old-agent"],
  "agents": {
    "planner": {
      "model": "anthropic/claude-opus-4",
      "temperature": 0.5,
      "enabled": true,
      "tools": {
        "read": true,
        "write": false
      }
    }
  }
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable plugin (opt-in) |
| `agents_dir` | string | `"./agents"` | Directory containing agent .md files |
| `default_model` | string | `"opencode/big-pickle"` | Default model for all agents |
| `context_dir` | string | `"./.openagents/context"` | Directory for context files |
| `add_prefix` | boolean | `true` | Add prefix to agent names |
| `primary_prefix` | string | `"(Open)"` | Prefix for primary agents |
| `subagent_prefix` | string | `"(OpenSub)"` | Prefix for subagents |
| `disabled_agents` | string[] | `[]` | List of agent names to disable |
| `agents` | object | `{}` | Per-agent configuration overrides |

### Per-Agent Overrides

```json
{
  "agents": {
    "planner": {
      "file": "./custom-planner.md",
      "model": "anthropic/claude-opus-4",
      "mode": "subagent",
      "temperature": 0.5,
      "maxTokens": 8000,
      "enabled": true,
      "description": "Custom planning agent",
      "tools": {
        "read": true,
        "write": false,
        "bash": true
      },
      "disabled_tools": ["webfetch"],
      "visible_to": ["plan", "build", "test"],
      "prefix": "(CustomPlan)"
    }
  }
}
```

## Global vs Project-Local Agents

### Project-Local Agents (Recommended)

**Location:** `.openagents/agents/` in your project

**Use Case:** Project-specific agents tailored to your codebase

**Example Structure:**
```
my-project/
├── .openagents/
│   ├── config.json
│   └── agents/
│       ├── planner.md
│       ├── coder.md
│       ├── tester.md
│       └── reviewer.md
├── src/
└── package.json
```

**Advantages:**
- ✅ Version controlled with project
- ✅ Team members get same agents
- ✅ Customized for project needs
- ✅ Easy to share and collaborate

### Global Agents (Future Feature)

**Location:** `~/.opencode/agents/` or similar

**Use Case:** Reusable agents across all projects

**Status:** Not yet implemented, but architecture supports it

**Future Implementation:**
```typescript
const agentDirs = [
  join(os.homedir(), ".opencode", "agents"),      // Global agents
  join(directory, ".openagents", "agents"),       // Project agents (override)
]
```

## Integration with Workflow System

### AgentExecutor Interface

The workflow system uses the `AgentExecutor` interface to execute agents:

```typescript
interface AgentExecutor {
  execute(agentName: string, input: any): Promise<any>
}
```

### Creating an AgentExecutor

To integrate OpenAgents with workflows, create an `AgentExecutor` implementation:

```typescript
import { loadAgents } from "./agents/loader"
import { loadConfig } from "./plugin/config"
import type { AgentExecutor } from "./workflow"

class OpenAgentsExecutor implements AgentExecutor {
  private agentMap: Map<string, AgentDefinition>
  private config: OpenAgentsConfig
  private client: OpenCodeClient

  constructor(directory: string, client: OpenCodeClient) {
    this.config = loadConfig(directory)
    this.client = client
    
    // Load agents from configured directories
    const agentDirs = [
      join(directory, ".openagents", this.config.agents_dir),
      join(directory, ".openagents", "agents"),
    ]
    
    this.agentMap = loadAgents(agentDirs)
    
    // Filter disabled agents
    const disabledSet = new Set(this.config.disabled_agents ?? [])
    for (const name of disabledSet) {
      this.agentMap.delete(name)
    }
  }

  async execute(agentName: string, input: any): Promise<any> {
    // Get agent definition
    const agent = this.agentMap.get(agentName)
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found. Available: ${[...this.agentMap.keys()].join(", ")}`)
    }

    // Get config overrides
    const override = this.config.agents?.[agentName]

    // Build agent config for OpenCode
    const agentConfig = {
      description: override?.description ?? agent.description,
      model: override?.model ?? agent.model ?? this.config.default_model,
      mode: override?.mode ?? agent.mode ?? "subagent",
      temperature: override?.temperature ?? agent.temperature,
      maxTokens: override?.maxTokens ?? agent.maxTokens,
      prompt: agent.prompt,
    }

    // Execute agent via OpenCode client
    // This is a simplified example - actual implementation depends on OpenCode API
    const response = await this.client.agent.execute({
      agent: agentConfig,
      input: input,
    })

    return response.data
  }

  getAvailableAgents(): string[] {
    return [...this.agentMap.keys()]
  }

  hasAgent(name: string): boolean {
    return this.agentMap.has(name)
  }
}
```

### Using AgentExecutor with Workflows

```typescript
import { WorkflowExecutor, AgentStepExecutor } from "./workflow"

// Create agent executor
const agentExecutor = new OpenAgentsExecutor(process.cwd(), client)

// Create UI manager
const uiManager = {
  showWorkflowStart: async (id) => console.log(`Starting: ${id}`),
  showWorkflowComplete: async (id, duration) => console.log(`Done: ${id} (${duration}ms)`),
  showWorkflowError: async (id, error) => console.error(`Error: ${id}`, error),
  showStepProgress: async (step, current, total) => console.log(`Step ${current}/${total}: ${step}`),
  showApprovalPrompt: async (message) => true,
}

// Create workflow executor
const workflowExecutor = new WorkflowExecutor({
  agentExecutor,
  uiManager,
})

// Register agent step executor
workflowExecutor.registerExecutor("agent", new AgentStepExecutor(agentExecutor))

// Execute workflow
const workflow = {
  id: "feature-workflow",
  description: "Plan → Code → Test",
  steps: [
    { id: "plan", type: "agent", agent: "planner", next: "code" },
    { id: "code", type: "agent", agent: "coder", next: "test" },
    { id: "test", type: "agent", agent: "tester" }
  ]
}

const result = await workflowExecutor.execute(workflow, {
  task: "Build authentication system"
})
```

## Agent Discovery Flow

```
1. Plugin Initialization
   ↓
2. Load Config (.openagents/config.json)
   ↓
3. Determine Agent Directories
   - .openagents/{agents_dir}
   - .openagents/agents
   ↓
4. Load All .md Files
   - Parse frontmatter
   - Extract prompt
   - Create AgentDefinition
   ↓
5. Apply Filters
   - Remove disabled_agents
   - Remove agents with enabled: false
   ↓
6. Apply Config Overrides
   - Merge per-agent settings
   - Override model, temperature, etc.
   ↓
7. Register with OpenCode
   - Convert to OpenCode format
   - Add to config.agent
   ↓
8. Available for Workflows
   - AgentExecutor can execute them
   - Workflow steps can reference them
```

## Session Lifecycle

### 1. Session Created

```typescript
// Plugin loads agents on session creation
event: async (input) => {
  if (input.event.type === "session.created") {
    // Agents already loaded during plugin init
    // Show toast notification
    await client.tui.showToast({
      title: "OpenAgents v0.1.0",
      message: `Loaded ${agentMap.size} agents`,
      variant: "success"
    })
  }
}
```

### 2. Agent Execution

```typescript
// When workflow executes agent step
const result = await agentExecutor.execute("planner", {
  input: { task: "Build feature" },
  context: { /* previous results */ }
})
```

### 3. Agent Registry

Agents are stored in a `Map<string, AgentDefinition>`:

```typescript
const agentMap = new Map([
  ["planner", { name: "planner", path: "...", prompt: "..." }],
  ["coder", { name: "coder", path: "...", prompt: "..." }],
  ["tester", { name: "tester", path: "...", prompt: "..." }],
])
```

## Best Practices

### 1. Agent Organization

```
.openagents/
├── config.json
└── agents/
    ├── planning/
    │   ├── planner.md
    │   └── architect.md
    ├── coding/
    │   ├── coder.md
    │   └── refactor.md
    └── testing/
        ├── tester.md
        └── reviewer.md
```

**Note:** Currently, subdirectories are not supported. All agents must be in the root `agents/` directory.

### 2. Agent Naming

- Use lowercase, hyphenated names: `code-reviewer.md`
- Avoid special characters
- Keep names short and descriptive
- Agent name = filename without extension

### 3. Config Management

**Development:**
```json
{
  "enabled": true,
  "agents": {
    "planner": { "temperature": 0.9 },
    "coder": { "model": "anthropic/claude-opus-4" }
  }
}
```

**Production:**
```json
{
  "enabled": true,
  "agents": {
    "planner": { "temperature": 0.5 },
    "coder": { "model": "anthropic/claude-sonnet-4" }
  }
}
```

### 4. Version Control

**Commit:**
- ✅ `.openagents/agents/*.md` (agent definitions)
- ✅ `.openagents/config.json` (base config)

**Ignore:**
- ❌ `.openagents/context/` (runtime context)
- ❌ `.openagents/config.local.json` (local overrides)

## Troubleshooting

### Agent Not Found

**Error:** `Agent 'planner' not found`

**Solutions:**
1. Check agent file exists: `.openagents/agents/planner.md`
2. Check agent is not disabled in config
3. Check agent name matches filename (without `.md`)
4. Verify config `agents_dir` points to correct directory

### Agent Not Loading

**Check:**
1. File extension is `.md` or `.mdc`
2. Frontmatter is valid YAML
3. No syntax errors in frontmatter
4. Agent is not in `disabled_agents` list

### Config Not Applied

**Check:**
1. Config file is in correct location
2. JSON is valid (use JSON validator)
3. Schema validation passes
4. Restart OpenCode session

## Future Enhancements

### 1. Global Agent Registry

```typescript
// Load from multiple sources
const agentDirs = [
  join(os.homedir(), ".opencode", "agents"),      // Global
  join(directory, ".openagents", "agents"),       // Project
  join(directory, "node_modules", "@openagents"), // NPM packages
]
```

### 2. Agent Marketplace

- Publish agents to NPM
- Install via `npm install @openagents/planner`
- Auto-discover from `node_modules`

### 3. Dynamic Agent Loading

- Hot reload agents without restart
- Watch for file changes
- Update registry on the fly

### 4. Agent Versioning

```markdown
---
version: "1.2.0"
requires: "opencode >= 2.0.0"
---
```

## Agent Resolution

Workflows can reference agents from multiple sources:

1. **OpenAgents** - Custom agents from `.openagents/agents/*.md`
2. **OpenCode Built-in** - Agents like `plan`, `build`, `test`, `review`
3. **Other Plugins** - Agents from other OpenCode plugins

The system automatically resolves agents from any source. See [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md) for details.

### Example: Mixed Agent Sources

```typescript
const workflow = {
  id: "mixed-workflow",
  steps: [
    { id: "plan", type: "agent", agent: "plan" },        // OpenCode built-in
    { id: "analyze", type: "agent", agent: "analyzer" }, // OpenAgents custom
    { id: "build", type: "agent", agent: "build" },      // OpenCode built-in
    { id: "test", type: "agent", agent: "tester" }       // OpenAgents custom
  ]
}
```

### Priority System

When multiple sources define the same agent:

1. **OpenAgents** (highest) - Your custom `.md` files
2. **OpenCode** - Built-in agents
3. **Plugins** - Other plugin agents

This lets you **override** built-in agents with custom versions!

## Summary

- ✅ Agents are loaded from `.openagents/agents/` directory
- ✅ Config in `.openagents/config.json` controls behavior
- ✅ Per-agent overrides allow customization
- ✅ AgentExecutor interface integrates with workflows
- ✅ Project-local agents are version controlled
- ✅ Can reference OpenCode built-in agents
- ✅ Can override built-in agents with custom versions
- ✅ Global agents coming in future release

For workflow creation, see [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md)  
For agent resolution details, see [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md)

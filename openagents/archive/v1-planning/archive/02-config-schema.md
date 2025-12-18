# Configuration Schema Design

**Last Updated**: Thu Dec 18 2025

---

## 🎯 Configuration Goals

1. **Simple defaults** - Works out of the box with free models
2. **Explicit control** - Clear what each setting does
3. **Type-safe** - Zod validation catches errors early
4. **Composable** - Agent configs can inherit from defaults
5. **Cost-aware** - Built-in cost limits and warnings

---

## 📋 Complete Configuration Schema

### **Root Configuration**

```typescript
import { z } from "zod"

export const OpenAgentsConfigSchema = z.object({
  // Schema reference for IDE support
  $schema: z.string().optional(),
  
  // Agent directory
  agents_dir: z.string().default("./agents"),
  
  // Context directory
  context_dir: z.string().default("./.openagents/context"),
  
  // Default model (free model)
  default_model: z.string().default("opencode/big-pickle"),
  
  // Cost limits
  cost_limits: z.object({
    per_agent: z.number().positive().default(0.10),      // $0.10 per agent
    per_workflow: z.number().positive().default(1.00),   // $1.00 per workflow
    daily: z.number().positive().default(10.00),         // $10.00 per day
    warn_at: z.number().min(0).max(1).default(0.8)       // Warn at 80%
  }).optional(),
  
  // Context settings
  context: z.object({
    enabled: z.boolean().default(true),
    max_size_kb: z.number().positive().default(100),
    ttl_seconds: z.number().positive().default(3600),    // 1 hour
    auto_cleanup: z.boolean().default(true)
  }).optional(),
  
  // Chunking settings (for 3k limit)
  chunking: z.object({
    enabled: z.boolean().default(true),
    max_chunk_size: z.number().positive().default(3000),
    split_on: z.enum(["paragraph", "sentence", "word"]).default("paragraph")
  }).optional(),
  
  // UI settings
  ui: z.object({
    show_toasts: z.boolean().default(true),
    toast_duration: z.number().positive().default(5000),
    show_progress: z.boolean().default(true),
    show_costs: z.boolean().default(true),
    log_level: z.enum(["debug", "info", "warn", "error"]).default("info")
  }).optional(),
  
  // Agent discovery
  agent_discovery: z.object({
    enabled: z.boolean().default(true),
    mode: z.enum(["explicit", "automatic", "disabled"]).default("explicit")
  }).optional(),
  
  // MCP configuration
  mcp: z.object({
    default: z.array(z.string()).default([]),
    restricted: z.array(z.string()).default([])
  }).optional(),
  
  // Disabled agents
  disabled_agents: z.array(z.string()).optional(),
  
  // Per-agent configuration
  agents: z.record(AgentConfigSchema).optional()
})

export type OpenAgentsConfig = z.infer<typeof OpenAgentsConfigSchema>
```

### **Agent Configuration Schema**

```typescript
export const AgentConfigSchema = z.object({
  // Basic settings
  enabled: z.boolean().optional(),
  description: z.string().optional(),
  model: z.string().optional(),
  mode: z.enum(["primary", "subagent"]).optional(),
  
  // Execution characteristics
  parallel: z.boolean().optional(),
  parallel_limit: z.number().positive().optional(),
  async: z.boolean().optional(),
  
  // Model settings
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  
  // Cost settings
  cost_limit: z.number().positive().optional(),
  cost_profile: z.enum(["low", "medium", "high"]).optional(),
  
  // Tool configuration
  tools: z.record(z.boolean()).optional(),
  disabled_tools: z.array(z.string()).optional(),
  
  // MCP access
  mcp: z.array(z.string()).optional(),
  
  // Context configuration
  context: z.object({
    input: z.array(z.string()).optional(),
    output: z.string().optional(),
    share_with: z.array(z.string()).optional()
  }).optional(),
  
  // Discovery settings
  can_discover: z.array(z.string()).optional(),
  can_be_discovered: z.boolean().optional(),
  
  // UI settings
  color: z.string().optional(),
  icon: z.string().optional()
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>
```

---

## 📝 Example Configurations

### **Example 1: Minimal (Uses Defaults)**

```json
{
  "agents_dir": "./agents"
}
```

**Result**:
- Uses `opencode/big-pickle` for all agents
- Default cost limits ($0.10 per agent)
- Context enabled with 1-hour TTL
- Toasts enabled
- All agents loaded from `./agents`

### **Example 2: Free Models Testing**

```json
{
  "$schema": "./schema.json",
  "default_model": "opencode/big-pickle",
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true,
      "parallel_limit": 5,
      "async": true,
      "temperature": 0.7
    },
    "coder": {
      "model": "opencode/big-pickle",
      "parallel": false,
      "async": false,
      "temperature": 0.2
    },
    "reviewer": {
      "model": "opencode/big-pickle",
      "parallel": false,
      "tools": {
        "write": false,
        "edit": false
      }
    }
  }
}
```

### **Example 3: Production with Cost Controls**

```json
{
  "$schema": "./schema.json",
  "default_model": "anthropic/claude-haiku-4",
  
  "cost_limits": {
    "per_agent": 0.05,
    "per_workflow": 0.50,
    "daily": 5.00,
    "warn_at": 0.75
  },
  
  "context": {
    "enabled": true,
    "max_size_kb": 50,
    "ttl_seconds": 1800,
    "auto_cleanup": true
  },
  
  "chunking": {
    "enabled": true,
    "max_chunk_size": 2800,
    "split_on": "paragraph"
  },
  
  "ui": {
    "show_toasts": true,
    "show_costs": true,
    "log_level": "info"
  },
  
  "agents": {
    "researcher": {
      "model": "anthropic/claude-haiku-4",
      "parallel": true,
      "parallel_limit": 10,
      "cost_limit": 0.02,
      "mcp": ["context7", "websearch-exa"],
      "context": {
        "output": "research-results",
        "share_with": ["planner", "synthesizer"]
      }
    },
    
    "planner": {
      "model": "anthropic/claude-sonnet-4-5",
      "parallel": false,
      "cost_limit": 0.10,
      "context": {
        "input": ["research-results", "requirements"],
        "output": "plan",
        "share_with": ["coder"]
      }
    },
    
    "coder": {
      "model": "anthropic/claude-sonnet-4-5",
      "parallel": false,
      "cost_limit": 0.20,
      "context": {
        "input": ["plan", "research-results"],
        "output": "implementation"
      }
    }
  }
}
```

### **Example 4: Complex Workflow with Discovery**

```json
{
  "$schema": "./schema.json",
  "default_model": "opencode/big-pickle",
  
  "agent_discovery": {
    "enabled": true,
    "mode": "explicit"
  },
  
  "mcp": {
    "default": ["filesystem"],
    "restricted": ["context7", "websearch-exa"]
  },
  
  "agents": {
    "orchestrator": {
      "model": "anthropic/claude-sonnet-4-5",
      "can_discover": ["researcher", "coder", "reviewer"],
      "can_be_discovered": false,
      "context": {
        "input": ["*"],
        "output": "orchestration"
      }
    },
    
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true,
      "parallel_limit": 10,
      "can_be_discovered": true,
      "mcp": ["context7", "websearch-exa"],
      "context": {
        "output": "research-{timestamp}",
        "share_with": ["orchestrator", "synthesizer"]
      }
    },
    
    "synthesizer": {
      "model": "anthropic/claude-sonnet-4",
      "can_be_discovered": true,
      "context": {
        "input": ["research-*"],
        "output": "synthesis"
      }
    }
  }
}
```

---

## 🔧 Configuration Loading

### **Functional Approach**

```typescript
// Pure: Merge configurations
const mergeConfigs = (
  base: OpenAgentsConfig,
  override: Partial<OpenAgentsConfig>
): OpenAgentsConfig => ({
  ...base,
  ...override,
  cost_limits: {
    ...base.cost_limits,
    ...override.cost_limits
  },
  context: {
    ...base.context,
    ...override.context
  },
  agents: {
    ...base.agents,
    ...override.agents
  }
})

// Pure: Get agent config with defaults
const getAgentConfig = (
  agentName: string,
  config: OpenAgentsConfig
): AgentConfig => {
  const agentConfig = config.agents?.[agentName] || {}
  
  return {
    enabled: agentConfig.enabled ?? true,
    model: agentConfig.model ?? config.default_model,
    parallel: agentConfig.parallel ?? false,
    async: agentConfig.async ?? false,
    temperature: agentConfig.temperature,
    max_tokens: agentConfig.max_tokens,
    tools: agentConfig.tools,
    mcp: agentConfig.mcp ?? config.mcp?.default ?? [],
    context: agentConfig.context,
    ...agentConfig
  }
}

// Impure: Load from file
const loadConfig = (directory: string): OpenAgentsConfig => {
  const configPaths = [
    join(directory, ".openagents", "config.json"),
    join(directory, ".openagents.json"),
    join(directory, "openagents.json")
  ]
  
  for (const path of configPaths) {
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8")
      const raw = JSON.parse(content)
      const result = OpenAgentsConfigSchema.safeParse(raw)
      
      if (result.success) {
        return result.data
      } else {
        console.warn(`Invalid config in ${path}:`, result.error.issues)
      }
    }
  }
  
  // Return defaults
  return OpenAgentsConfigSchema.parse({})
}

// Pure: Validate agent config
const validateAgentConfig = (
  agentName: string,
  config: AgentConfig
): Result<AgentConfig> => {
  // Check model exists
  if (config.model && !isValidModel(config.model)) {
    return {
      ok: false,
      error: new Error(`Invalid model for ${agentName}: ${config.model}`)
    }
  }
  
  // Check parallel limit
  if (config.parallel && config.parallel_limit && config.parallel_limit > 20) {
    return {
      ok: false,
      error: new Error(`Parallel limit too high for ${agentName}: ${config.parallel_limit}`)
    }
  }
  
  // Check cost limit
  if (config.cost_limit && config.cost_limit > 1.0) {
    return {
      ok: false,
      error: new Error(`Cost limit too high for ${agentName}: $${config.cost_limit}`)
    }
  }
  
  return { ok: true, value: config }
}
```

---

## 🎨 Configuration Composition

### **Inherit from Defaults**

```typescript
// Pure: Create agent config with inheritance
const createAgentConfigWithDefaults = (
  agentName: string,
  agentConfig: Partial<AgentConfig>,
  defaults: OpenAgentsConfig
): AgentConfig => {
  const baseConfig: AgentConfig = {
    enabled: true,
    model: defaults.default_model,
    parallel: false,
    async: false,
    mcp: defaults.mcp?.default ?? [],
    can_be_discovered: defaults.agent_discovery?.enabled ?? true
  }
  
  return {
    ...baseConfig,
    ...agentConfig
  }
}

// Pure: Apply cost profile
const applyCostProfile = (
  config: AgentConfig,
  profile: "low" | "medium" | "high"
): AgentConfig => {
  const profiles = {
    low: {
      model: "opencode/grok-fast",
      cost_limit: 0.01,
      max_tokens: 2048
    },
    medium: {
      model: "anthropic/claude-haiku-4",
      cost_limit: 0.05,
      max_tokens: 4096
    },
    high: {
      model: "anthropic/claude-sonnet-4-5",
      cost_limit: 0.20,
      max_tokens: 8192
    }
  }
  
  const profileConfig = profiles[profile]
  
  return {
    ...config,
    model: config.model ?? profileConfig.model,
    cost_limit: config.cost_limit ?? profileConfig.cost_limit,
    max_tokens: config.max_tokens ?? profileConfig.max_tokens
  }
}
```

---

## 📊 Configuration Validation

### **Validation Pipeline**

```typescript
// Pure: Validation pipeline
const validateConfig = (
  config: OpenAgentsConfig
): Result<OpenAgentsConfig> => {
  // Validate cost limits
  if (config.cost_limits) {
    if (config.cost_limits.per_agent > config.cost_limits.per_workflow) {
      return {
        ok: false,
        error: new Error("per_agent limit cannot exceed per_workflow limit")
      }
    }
    
    if (config.cost_limits.per_workflow > config.cost_limits.daily) {
      return {
        ok: false,
        error: new Error("per_workflow limit cannot exceed daily limit")
      }
    }
  }
  
  // Validate context settings
  if (config.context && config.context.max_size_kb > 1000) {
    return {
      ok: false,
      error: new Error("max_size_kb cannot exceed 1000 (1MB)")
    }
  }
  
  // Validate chunking
  if (config.chunking && config.chunking.max_chunk_size > 5000) {
    return {
      ok: false,
      error: new Error("max_chunk_size cannot exceed 5000")
    }
  }
  
  // Validate agents
  if (config.agents) {
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      const result = validateAgentConfig(name, agentConfig)
      if (!result.ok) return result
    }
  }
  
  return { ok: true, value: config }
}
```

---

## 🔍 Configuration Helpers

### **Query Functions**

```typescript
// Pure: Get all enabled agents
const getEnabledAgents = (config: OpenAgentsConfig): string[] =>
  Object.entries(config.agents || {})
    .filter(([_, cfg]) => cfg.enabled !== false)
    .map(([name, _]) => name)

// Pure: Get parallel agents
const getParallelAgents = (config: OpenAgentsConfig): string[] =>
  Object.entries(config.agents || {})
    .filter(([_, cfg]) => cfg.parallel === true)
    .map(([name, _]) => name)

// Pure: Get agents with MCP access
const getAgentsWithMCP = (
  config: OpenAgentsConfig,
  mcp: string
): string[] =>
  Object.entries(config.agents || {})
    .filter(([_, cfg]) => cfg.mcp?.includes(mcp))
    .map(([name, _]) => name)

// Pure: Get discoverable agents
const getDiscoverableAgents = (
  config: OpenAgentsConfig,
  fromAgent: string
): string[] => {
  const agentConfig = config.agents?.[fromAgent]
  
  if (!agentConfig?.can_discover) {
    return []
  }
  
  return agentConfig.can_discover.filter(name => {
    const targetConfig = config.agents?.[name]
    return targetConfig?.can_be_discovered !== false
  })
}
```

---

**Next**: [03-context-system.md](./03-context-system.md) - Context management design

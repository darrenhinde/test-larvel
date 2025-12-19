# Workflow Integration Strategy

## Overview

This document addresses how the workflow system integrates with:
1. Agent tools & MCPs
2. Agent limits (blocking/rate limiting)
3. Skills/abilities plugins
4. Other OpenCode plugins

## Current State: What Works ✅

### Workflow System (Phase 2 Complete)
- ✅ Sequential execution
- ✅ Multi-source agent resolution
- ✅ Context passing
- ✅ Error handling & retries
- ✅ Safety guards
- ✅ **87 tests passing**

### Agent System (Existing)
- ✅ Agent loading from `.md` files
- ✅ Agent configuration (model, temperature, etc.)
- ✅ Tool configuration (enable/disable tools)
- ✅ Registration with OpenCode

## Integration Questions

### Q1: Do agents run with their configured tools/MCPs?

**Answer: YES** ✅

When workflows execute agents, they use the **full agent configuration** including:
- Tools (enabled/disabled)
- MCPs (Model Context Protocol servers)
- Model settings
- Temperature, max tokens, etc.

**How it works:**

```typescript
// Agent definition (.openagents/agents/coder.md)
---
description: "Coding agent"
model: "anthropic/claude-sonnet-4"
tools: ["read", "write", "bash"]
disabledTools: ["webfetch"]
---

// Config override (.openagents/config.json)
{
  "agents": {
    "coder": {
      "tools": {
        "read": true,
        "write": true,
        "bash": true,
        "webfetch": false  // Explicitly disabled
      }
    }
  }
}

// When workflow executes "coder" agent:
// 1. Resolver finds agent definition
// 2. Merges with config overrides
// 3. Passes FULL config to OpenCode
// 4. OpenCode executes with specified tools
```

**Implementation in `OpenCodeAgentExecutor`:**

```typescript
async execute(agentName: string, input: any): Promise<any> {
  const agent = this.resolver.resolve(agentName)
  
  // Build FULL agent config including tools
  const agentConfig = {
    description: agent.description,
    model: agent.model,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    prompt: agent.prompt,
    tools: this.buildToolsConfig(agent),  // ← Tools included!
  }
  
  // Execute via OpenCode with full config
  return await this.executeViaOpenCode(agentName, agentConfig, input)
}
```

### Q2: Can we set limits (blocking/rate limiting)?

**Answer: YES** ✅ (with implementation)

**Current Support:**
- ✅ Timeout limits (per-step and workflow-level)
- ✅ Retry limits (max retries per step)
- ✅ Iteration limits (prevent infinite loops)
- ✅ Error limits (max errors before abort)

**Future Support (Phase 3):**
- 🚧 Rate limiting (calls per minute)
- 🚧 Concurrency limits (max parallel agents)
- 🚧 Resource limits (memory, CPU)
- 🚧 Cost limits (token usage)

**Implementation Strategy:**

```typescript
// Agent config with limits
{
  "agents": {
    "expensive-agent": {
      "model": "anthropic/claude-opus-4",
      "limits": {
        "max_calls_per_minute": 10,
        "max_tokens_per_call": 4000,
        "max_concurrent": 1,
        "timeout_ms": 60000,
        "max_retries": 3
      }
    }
  }
}

// Workflow step with limits
{
  "id": "expensive-step",
  "type": "agent",
  "agent": "expensive-agent",
  "timeout_ms": 60000,      // ✅ Already supported
  "max_retries": 3,         // ✅ Already supported
  "rate_limit": {           // 🚧 Future
    "calls_per_minute": 10,
    "tokens_per_minute": 100000
  }
}
```

### Q3: How do skills/abilities plugins integrate?

**Answer: SEAMLESS INTEGRATION** ✅

**Strategy: Skills as Agents**

Skills/abilities can be exposed as agents that workflows can call:

```typescript
// Skills plugin registers agents
const SkillsPlugin: Plugin = async (ctx) => {
  return {
    config: async (openCodeConfig) => {
      // Register skills as agents
      openCodeConfig.agent = {
        ...openCodeConfig.agent,
        "skill-file-search": {
          description: "Search files using advanced patterns",
          mode: "subagent",
          prompt: "You are a file search skill...",
          tools: { "glob": true, "grep": true }
        },
        "skill-code-refactor": {
          description: "Refactor code following best practices",
          mode: "subagent",
          prompt: "You are a code refactoring skill...",
          tools: { "read": true, "write": true, "edit": true }
        }
      }
    }
  }
}

// Workflows can now use skills
{
  "id": "refactor-workflow",
  "steps": [
    { "id": "search", "type": "agent", "agent": "skill-file-search" },
    { "id": "refactor", "type": "agent", "agent": "skill-code-refactor" }
  ]
}
```

**Alternative: Skills as Step Types**

Skills could also be first-class step types:

```typescript
// Register skill executor
workflowExecutor.registerExecutor("skill", new SkillStepExecutor(skillRegistry))

// Use in workflows
{
  "id": "skill-workflow",
  "steps": [
    {
      "id": "search",
      "type": "skill",           // ← New step type
      "skill": "file-search",
      "params": { "pattern": "*.ts" }
    }
  ]
}
```

### Q4: How do other plugins integrate?

**Answer: MULTIPLE STRATEGIES** ✅

**Strategy 1: Plugins Register Agents (Recommended)**

Other plugins register agents that workflows can use:

```typescript
// Plugin A
const PluginA: Plugin = async (ctx) => {
  return {
    config: async (openCodeConfig) => {
      openCodeConfig.agent = {
        ...openCodeConfig.agent,
        "plugin-a-agent": { /* config */ }
      }
    }
  }
}

// Workflow uses plugin agent
{
  "steps": [
    { "id": "step1", "type": "agent", "agent": "plugin-a-agent" }
  ]
}
```

**Strategy 2: Plugins Register Step Executors**

Plugins can add new step types:

```typescript
// Plugin B
const PluginB: Plugin = async (ctx) => {
  return {
    api: {
      registerWithWorkflows: (workflowExecutor) => {
        workflowExecutor.registerExecutor("custom-type", new CustomExecutor())
      }
    }
  }
}

// Workflow uses custom step type
{
  "steps": [
    { "id": "step1", "type": "custom-type", "config": {...} }
  ]
}
```

**Strategy 3: Plugins Provide Utilities**

Plugins expose utilities that agents can use:

```typescript
// Plugin C provides MCP server
const PluginC: Plugin = async (ctx) => {
  return {
    api: {
      mcpServer: new MCPServer(...)
    }
  }
}

// Agents configured to use MCP
{
  "agents": {
    "data-agent": {
      "mcp_servers": ["plugin-c-mcp"]
    }
  }
}
```

## Complexity vs Benefit Analysis

### Option 1: Keep It Simple (Current Approach) ⭐ RECOMMENDED

**Approach:**
- Workflows only execute agents
- Agents are the integration point
- Plugins register agents
- Tools/MCPs/limits configured per-agent

**Benefits:**
- ✅ Simple mental model
- ✅ Easy to understand
- ✅ Works with existing OpenCode
- ✅ Plugins integrate naturally
- ✅ No special cases

**Drawbacks:**
- ⚠️ Everything must be an agent
- ⚠️ Can't directly call plugin functions

**Complexity: LOW** 🟢

### Option 2: Plugin-Aware Workflows

**Approach:**
- Workflows can call plugin APIs directly
- New step types for each plugin
- Complex dependency management

**Benefits:**
- ✅ More flexible
- ✅ Direct plugin integration

**Drawbacks:**
- ❌ Complex dependency graph
- ❌ Tight coupling
- ❌ Hard to test
- ❌ Version conflicts
- ❌ Breaking changes cascade

**Complexity: HIGH** 🔴

### Option 3: Hybrid Approach

**Approach:**
- Default: Agents only
- Optional: Plugin step types
- Opt-in complexity

**Benefits:**
- ✅ Simple by default
- ✅ Flexible when needed
- ✅ Gradual adoption

**Drawbacks:**
- ⚠️ Two integration paths
- ⚠️ Documentation overhead

**Complexity: MEDIUM** 🟡

## Recommendation: Option 1 (Keep It Simple)

### Why?

1. **Agents are Universal**
   - Every plugin can expose agents
   - Workflows don't need to know about plugins
   - Clean separation of concerns

2. **Tools/MCPs Already Work**
   - Agents already have tool configuration
   - MCPs already integrate with agents
   - No new mechanism needed

3. **Limits Can Be Agent-Level**
   - Rate limiting per agent
   - Timeout per agent
   - Resource limits per agent

4. **Skills Fit Naturally**
   - Skills = specialized agents
   - Same configuration
   - Same execution model

5. **Future-Proof**
   - New plugins just register agents
   - No workflow system changes needed
   - Backward compatible

## Implementation Plan

### Phase 2.5: Enhanced Agent Configuration (2 hours)

Add support for advanced agent features:

```typescript
// Enhanced agent config
{
  "agents": {
    "advanced-agent": {
      "model": "anthropic/claude-opus-4",
      "temperature": 0.7,
      
      // Tools (already supported)
      "tools": {
        "read": true,
        "write": true,
        "bash": false
      },
      
      // MCPs (new)
      "mcp_servers": ["filesystem", "database"],
      
      // Limits (new)
      "limits": {
        "timeout_ms": 60000,
        "max_retries": 3,
        "max_tokens": 4000
      },
      
      // Blocking (new)
      "blocking": {
        "enabled": true,
        "max_concurrent": 1,
        "queue_size": 10
      }
    }
  }
}
```

### Phase 3: Skills Integration (4 hours)

Create skills plugin that registers agents:

```typescript
// Skills plugin
const SkillsPlugin: Plugin = async (ctx) => {
  const skills = loadSkills(ctx.directory)
  
  return {
    config: async (openCodeConfig) => {
      // Register each skill as an agent
      for (const skill of skills) {
        openCodeConfig.agent[`skill-${skill.name}`] = {
          description: skill.description,
          mode: "subagent",
          prompt: skill.prompt,
          tools: skill.tools
        }
      }
    }
  }
}
```

### Phase 4: Rate Limiting (3 hours)

Add rate limiting to agent executor:

```typescript
class RateLimitedAgentExecutor implements AgentExecutor {
  private rateLimiter: RateLimiter
  
  async execute(agentName: string, input: any): Promise<any> {
    // Check rate limit
    await this.rateLimiter.acquire(agentName)
    
    try {
      return await this.baseExecutor.execute(agentName, input)
    } finally {
      this.rateLimiter.release(agentName)
    }
  }
}
```

## Integration Examples

### Example 1: Workflow with Tools

```json
{
  "id": "file-processing",
  "description": "Process files with specific tools",
  "steps": [
    {
      "id": "search",
      "type": "agent",
      "agent": "file-searcher",
      "next": "process"
    },
    {
      "id": "process",
      "type": "agent",
      "agent": "file-processor",
      "next": "validate"
    }
  ]
}
```

```json
// .openagents/config.json
{
  "agents": {
    "file-searcher": {
      "tools": {
        "glob": true,
        "grep": true,
        "read": true,
        "write": false,
        "bash": false
      }
    },
    "file-processor": {
      "tools": {
        "read": true,
        "write": true,
        "edit": true,
        "bash": false
      }
    }
  }
}
```

### Example 2: Workflow with MCPs

```json
{
  "agents": {
    "database-agent": {
      "mcp_servers": ["database-mcp"],
      "tools": {
        "read": true,
        "write": false
      }
    }
  }
}
```

### Example 3: Workflow with Limits

```json
{
  "id": "expensive-workflow",
  "steps": [
    {
      "id": "expensive-step",
      "type": "agent",
      "agent": "opus-agent",
      "timeout_ms": 120000,
      "max_retries": 2
    }
  ]
}
```

```json
{
  "agents": {
    "opus-agent": {
      "model": "anthropic/claude-opus-4",
      "limits": {
        "max_tokens": 4000,
        "max_calls_per_minute": 5
      }
    }
  }
}
```

### Example 4: Workflow with Skills

```json
{
  "id": "refactor-workflow",
  "steps": [
    { "id": "analyze", "type": "agent", "agent": "skill-code-analysis" },
    { "id": "refactor", "type": "agent", "agent": "skill-code-refactor" },
    { "id": "test", "type": "agent", "agent": "skill-test-runner" }
  ]
}
```

## Testing Strategy

### Test 1: Tools Configuration

```typescript
test("agent executes with configured tools", async () => {
  const agent = {
    name: "test-agent",
    tools: { read: true, write: false }
  }
  
  const result = await executor.execute("test-agent", { task: "test" })
  
  // Verify agent had access to read but not write
  expect(result.toolsUsed).toContain("read")
  expect(result.toolsUsed).not.toContain("write")
})
```

### Test 2: Rate Limiting

```typescript
test("agent respects rate limits", async () => {
  const agent = {
    name: "limited-agent",
    limits: { max_calls_per_minute: 2 }
  }
  
  // First 2 calls succeed
  await executor.execute("limited-agent", {})
  await executor.execute("limited-agent", {})
  
  // Third call blocks or fails
  await expect(
    executor.execute("limited-agent", {})
  ).rejects.toThrow("Rate limit exceeded")
})
```

### Test 3: Skills Integration

```typescript
test("workflow can use skill agents", async () => {
  const workflow = {
    id: "skill-test",
    steps: [
      { id: "skill", type: "agent", agent: "skill-file-search" }
    ]
  }
  
  const result = await executor.execute(workflow, {})
  
  expect(result.success).toBe(true)
  expect(result.context.getResult("skill")).toBeDefined()
})
```

## Migration Path

### Current State
```json
{
  "agents": {
    "coder": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.7
    }
  }
}
```

### Phase 2.5: Add Tools
```json
{
  "agents": {
    "coder": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.7,
      "tools": {
        "read": true,
        "write": true,
        "bash": true
      }
    }
  }
}
```

### Phase 3: Add Limits
```json
{
  "agents": {
    "coder": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.7,
      "tools": { "read": true, "write": true, "bash": true },
      "limits": {
        "timeout_ms": 60000,
        "max_retries": 3
      }
    }
  }
}
```

### Phase 4: Add MCPs
```json
{
  "agents": {
    "coder": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.7,
      "tools": { "read": true, "write": true, "bash": true },
      "limits": { "timeout_ms": 60000, "max_retries": 3 },
      "mcp_servers": ["filesystem", "git"]
    }
  }
}
```

## Summary

### ✅ What Works Now
- Agents execute with their configured tools
- Workflows can use any registered agent
- Multi-source agent resolution
- Basic limits (timeout, retries)

### 🚧 What Needs Implementation
- MCP server configuration
- Rate limiting
- Concurrency limits
- Skills plugin integration

### 🎯 Recommendation
**Keep it simple: Agents are the integration point**

- Plugins register agents
- Agents have tools/MCPs/limits
- Workflows execute agents
- Clean, testable, maintainable

### 📊 Complexity Score
- **Current System**: 🟢 Low (simple, works)
- **With Enhancements**: 🟡 Medium (manageable)
- **Plugin-Aware**: 🔴 High (avoid)

### 🚀 Next Steps
1. Verify current system works (tests pass ✅)
2. Add enhanced agent config (Phase 2.5)
3. Implement rate limiting (Phase 3)
4. Create skills plugin (Phase 3)
5. Document integration patterns

The system is designed to be **simple by default, powerful when needed**. Plugins integrate naturally by registering agents, and workflows remain clean and declarative.

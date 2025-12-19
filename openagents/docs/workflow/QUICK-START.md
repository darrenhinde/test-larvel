# Workflow Quick Start Guide

## 5-Minute Setup

### 1. Create Agent Files

Create `.openagents/agents/planner.md`:

```markdown
---
description: "Plans features and breaks them into tasks"
model: "anthropic/claude-sonnet-4"
mode: "subagent"
---

You are a planning agent. Break down features into actionable tasks.
```

Create `.openagents/agents/coder.md`:

```markdown
---
description: "Implements features based on plans"
model: "anthropic/claude-sonnet-4"
mode: "subagent"
---

You are a coding agent. Implement features based on the plan provided.
```

### 2. Create Workflow

Create `.openagents/workflows/feature.json`:

```json
{
  "id": "feature-workflow",
  "description": "Plan → Code → Test",
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "planner",
      "next": "code"
    },
    {
      "id": "code",
      "type": "agent",
      "agent": "coder",
      "input": "plan",
      "next": "test"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "test"
    }
  ]
}
```

### 3. Run Workflow

```bash
# In OpenCode
/run-workflow .openagents/workflows/feature.json '{"task": "Build login page"}'
```

## Common Patterns

### Pattern 1: Plan → Code → Test

```json
{
  "id": "standard-feature",
  "description": "Standard feature development",
  "steps": [
    { "id": "plan", "type": "agent", "agent": "plan", "next": "code" },
    { "id": "code", "type": "agent", "agent": "build", "next": "test" },
    { "id": "test", "type": "agent", "agent": "test" }
  ]
}
```

### Pattern 2: With Error Handling

```json
{
  "id": "resilient-feature",
  "description": "Feature with error recovery",
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "plan",
      "next": "code",
      "on_error": "error-handler"
    },
    {
      "id": "code",
      "type": "agent",
      "agent": "build",
      "max_retries": 3,
      "next": "test",
      "on_error": "error-handler"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "test",
      "on_error": "error-handler"
    },
    {
      "id": "error-handler",
      "type": "agent",
      "agent": "error-recovery"
    }
  ]
}
```

### Pattern 3: Conditional Deployment

```json
{
  "id": "deploy-if-tests-pass",
  "description": "Deploy only if tests pass",
  "steps": [
    { "id": "build", "type": "agent", "agent": "build", "next": "test" },
    { "id": "test", "type": "agent", "agent": "test", "next": "check" },
    {
      "id": "check",
      "type": "condition",
      "condition": "test.passed === true",
      "then": "deploy",
      "else": "notify"
    },
    { "id": "deploy", "type": "agent", "agent": "deploy" },
    { "id": "notify", "type": "agent", "agent": "notifier" }
  ]
}
```

## Agent Sources

### Use OpenCode Built-in Agents

```json
{
  "steps": [
    { "id": "plan", "type": "agent", "agent": "plan" },
    { "id": "build", "type": "agent", "agent": "build" },
    { "id": "test", "type": "agent", "agent": "test" },
    { "id": "review", "type": "agent", "agent": "review" }
  ]
}
```

### Use Custom OpenAgents

```json
{
  "steps": [
    { "id": "analyze", "type": "agent", "agent": "analyzer" },
    { "id": "optimize", "type": "agent", "agent": "optimizer" },
    { "id": "document", "type": "agent", "agent": "documenter" }
  ]
}
```

### Mix Both

```json
{
  "steps": [
    { "id": "plan", "type": "agent", "agent": "plan" },           // OpenCode
    { "id": "analyze", "type": "agent", "agent": "analyzer" },    // Custom
    { "id": "build", "type": "agent", "agent": "build" },         // OpenCode
    { "id": "custom-test", "type": "agent", "agent": "tester" }   // Custom
  ]
}
```

## Configuration

### Basic Config

`.openagents/config.json`:

```json
{
  "enabled": true,
  "agents_dir": "./agents",
  "default_model": "anthropic/claude-sonnet-4"
}
```

### Advanced Config

```json
{
  "enabled": true,
  "agents_dir": "./agents",
  "default_model": "anthropic/claude-sonnet-4",
  "agents": {
    "planner": {
      "model": "anthropic/claude-opus-4",
      "temperature": 0.7
    },
    "coder": {
      "max_retries": 3,
      "timeout_ms": 120000
    }
  }
}
```

## Debugging

### Enable Debug Mode

```json
{
  "id": "debug-workflow",
  "debug": true,
  "trace": true,
  "steps": [...]
}
```

### Check Available Agents

```typescript
// In code
const agents = resolver.listAgentNames()
console.log("Available:", agents)

// Output:
// Available: plan, build, test, review, planner, coder, tester
```

### Check Agent Source

```typescript
const agent = resolver.resolve("planner")
console.log(`${agent.name} from ${agent.source}`)

// Output:
// planner from openagents
```

## Common Issues

### Agent Not Found

**Error:** `Agent 'myagent' not found`

**Fix:**
1. Check file exists: `.openagents/agents/myagent.md`
2. Check spelling in workflow
3. List available: `resolver.listAgentNames()`

### Workflow Fails

**Error:** `Step 'code' failed`

**Fix:**
1. Add error handler: `"on_error": "error-handler"`
2. Add retries: `"max_retries": 3`
3. Enable debug: `"debug": true`

### Context Too Large

**Error:** Workflow slows down

**Fix:**
```json
{
  "max_context_size": 50,
  "context_retention": "recent"
}
```

## Next Steps

- 📖 Read [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md) for complete reference
- 🔧 Read [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md) for agent details
- 🎯 Read [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md) for multi-source agents
- 💻 Read [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) for integration

## Examples

See `examples/workflow-basic.ts` for a working example.

## Summary

- ✅ Create agents in `.openagents/agents/*.md`
- ✅ Create workflows in `.openagents/workflows/*.json`
- ✅ Run with `/run-workflow` command
- ✅ Mix OpenCode and custom agents
- ✅ Add error handling and retries
- ✅ Debug with `debug: true`

Happy workflow building! 🚀

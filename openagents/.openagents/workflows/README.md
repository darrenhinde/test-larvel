# OpenAgents Workflows

This directory contains workflow definitions for orchestrating multiple agents.

## Available Workflows

### `simple.json`
Single-step workflow for testing.
```bash
/workflow simple "Create a plan for authentication"
```

### `feature.json`
Complete feature development workflow: Plan → Build → Test
```bash
/workflow feature "Add user authentication"
```

### `analyze.json`
Code analysis workflow using custom agents: Research → Review
```bash
/workflow analyze "Analyze the authentication module"
```

### `refactor.json`
Full refactoring workflow with error handling: Analyze → Refactor → Test → Review
```bash
/workflow refactor "Refactor the user service"
```

## Workflow Structure

```json
{
  "id": "workflow-id",
  "description": "Workflow description",
  "max_iterations": 10,
  "max_duration_ms": 600000,
  "steps": [
    {
      "id": "step-id",
      "type": "agent",
      "agent": "agent-name",
      "next": "next-step-id",
      "on_error": "error-handler-step-id",
      "timeout_ms": 120000,
      "max_retries": 2
    }
  ]
}
```

## Step Types

- **agent**: Execute an agent (OpenCode built-in or custom)
- **transform**: Transform data using JavaScript expression
- **condition**: Conditional routing based on expression

## Agent References

Workflows can use:
- OpenCode built-in agents: `plan`, `build`, `test`, `review`
- Custom OpenAgents agents: Any agent from `.openagents/agents/`
- Plugin agents: Any agent registered by plugins

## Context Passing

Steps can reference previous step outputs:
```json
{
  "id": "build",
  "type": "agent",
  "agent": "build",
  "input": "plan"
}
```

This passes the `plan` step's output to the `build` agent.

## Error Handling

Steps can define error handlers:
```json
{
  "id": "build",
  "type": "agent",
  "agent": "build",
  "on_error": "error_handler"
}
```

## Creating Custom Workflows

1. Create a new JSON file in this directory
2. Define workflow structure (see examples above)
3. Run with `/workflow <filename-without-extension>`

Example:
```bash
# Create my-workflow.json
/workflow my-workflow "Task description"
```

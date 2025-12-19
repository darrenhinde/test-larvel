# Task 03: Create Example Workflows

**Estimated Time:** 15 minutes  
**Priority:** Medium  
**Status:** ⏳ Pending  
**Depends On:** Task 02

---

## 🎯 Objective

Create example workflow definitions that demonstrate different workflow patterns and use cases.

---

## 📋 Requirements

1. Create `.openagents/workflows/` directory
2. Create `feature.json` - Feature development workflow (plan → build → test)
3. Create `analyze.json` - Code analysis workflow (research → review)
4. Create `refactor.json` - Refactoring workflow with error handling
5. Ensure workflows use both OpenCode and OpenAgents agents

---

## 🔨 Implementation

### Directory Structure

```
.openagents/
  workflows/
    feature.json      # Feature development
    analyze.json      # Code analysis
    refactor.json     # Refactoring with error handling
```

### File: `.openagents/workflows/feature.json`

```json
{
  "id": "feature-workflow",
  "description": "Complete feature development: Plan → Build → Test",
  "max_iterations": 10,
  "max_duration_ms": 600000,
  "steps": [
    {
      "id": "plan",
      "type": "agent",
      "agent": "plan",
      "next": "build",
      "timeout_ms": 120000
    },
    {
      "id": "build",
      "type": "agent",
      "agent": "build",
      "input": "plan",
      "next": "test",
      "timeout_ms": 300000,
      "max_retries": 2,
      "on_error": "error-handler"
    },
    {
      "id": "test",
      "type": "agent",
      "agent": "test",
      "input": "build",
      "timeout_ms": 180000
    },
    {
      "id": "error-handler",
      "type": "agent",
      "agent": "plan",
      "next": "build"
    }
  ]
}
```

### File: `.openagents/workflows/analyze.json`

```json
{
  "id": "analyze-workflow",
  "description": "Analyze codebase using custom agents",
  "max_iterations": 5,
  "max_duration_ms": 300000,
  "steps": [
    {
      "id": "research",
      "type": "agent",
      "agent": "researcher",
      "next": "review",
      "timeout_ms": 120000
    },
    {
      "id": "review",
      "type": "agent",
      "agent": "reviewer",
      "input": "research",
      "timeout_ms": 120000
    }
  ]
}
```

### File: `.openagents/workflows/refactor.json`

```json
{
  "id": "refactor-workflow",
  "description": "Refactor code with analysis and validation",
  "max_iterations": 10,
  "max_duration_ms": 600000,
  "steps": [
    {
      "id": "analyze",
      "type": "agent",
      "agent": "researcher",
      "next": "plan-refactor",
      "timeout_ms": 120000
    },
    {
      "id": "plan-refactor",
      "type": "agent",
      "agent": "plan",
      "input": "analyze",
      "next": "execute-refactor",
      "timeout_ms": 120000
    },
    {
      "id": "execute-refactor",
      "type": "agent",
      "agent": "coder",
      "input": "plan-refactor",
      "next": "validate",
      "timeout_ms": 300000,
      "max_retries": 3,
      "on_error": "error-recovery"
    },
    {
      "id": "validate",
      "type": "agent",
      "agent": "test",
      "input": "execute-refactor",
      "next": "final-review",
      "timeout_ms": 180000
    },
    {
      "id": "final-review",
      "type": "agent",
      "agent": "reviewer",
      "input": "validate",
      "timeout_ms": 120000
    },
    {
      "id": "error-recovery",
      "type": "agent",
      "agent": "plan",
      "next": "execute-refactor"
    }
  ]
}
```

### File: `.openagents/workflows/README.md`

```markdown
# OpenAgents Workflows

This directory contains workflow definitions for the OpenAgents workflow system.

## Available Workflows

### `feature.json` - Feature Development
Complete feature development workflow:
1. **Plan** - Create feature plan
2. **Build** - Implement the feature
3. **Test** - Run tests

**Usage:**
\`\`\`bash
/workflow feature "Add user authentication"
\`\`\`

### `analyze.json` - Code Analysis
Analyze codebase using custom agents:
1. **Research** - Research codebase structure
2. **Review** - Review findings

**Usage:**
\`\`\`bash
/workflow analyze "Analyze authentication module"
\`\`\`

### `refactor.json` - Code Refactoring
Comprehensive refactoring workflow with validation:
1. **Analyze** - Analyze code to refactor
2. **Plan** - Create refactoring plan
3. **Execute** - Perform refactoring
4. **Validate** - Run tests
5. **Review** - Final review

**Usage:**
\`\`\`bash
/workflow refactor "Refactor user service"
\`\`\`

## Creating Custom Workflows

Create a new JSON file in this directory with the following structure:

\`\`\`json
{
  "id": "my-workflow",
  "description": "Description of workflow",
  "max_iterations": 10,
  "max_duration_ms": 600000,
  "steps": [
    {
      "id": "step1",
      "type": "agent",
      "agent": "agent-name",
      "next": "step2",
      "timeout_ms": 120000
    }
  ]
}
\`\`\`

### Step Types

- **agent** - Execute an agent
- **transform** - Transform data
- **condition** - Conditional routing

### Step Properties

- `id` - Unique step identifier
- `type` - Step type (agent, transform, condition)
- `agent` - Agent name (for agent steps)
- `next` - Next step ID
- `input` - Reference to previous step output
- `timeout_ms` - Step timeout
- `max_retries` - Maximum retry attempts
- `on_error` - Error handler step ID

## Available Agents

### OpenCode Built-in
- `plan` - Planning agent
- `build` - Build/implementation agent
- `test` - Testing agent
- `review` - Code review agent

### OpenAgents Custom
- `researcher` - Research and exploration
- `reviewer` - Code review and analysis
- `coder` - Coding and implementation

## Tips

1. **Keep workflows focused** - Each workflow should have a clear purpose
2. **Use error handlers** - Add `on_error` for critical steps
3. **Set timeouts** - Prevent workflows from hanging
4. **Pass context** - Use `input` to reference previous steps
5. **Test incrementally** - Start with simple workflows
\`\`\`

---

## ✅ Acceptance Criteria

- [ ] Directory `.openagents/workflows/` created
- [ ] `feature.json` created (plan → build → test)
- [ ] `analyze.json` created (research → review)
- [ ] `refactor.json` created (with error handling)
- [ ] `README.md` created with documentation
- [ ] Workflows use both OpenCode and OpenAgents agents
- [ ] Workflows have proper timeouts and retries
- [ ] Workflows have error handlers where appropriate
- [ ] JSON is valid and properly formatted

---

## 🧪 Testing

```bash
# Test each workflow
/workflow feature "Add login feature"
/workflow analyze "Analyze auth module"
/workflow refactor "Refactor user service"

# Verify:
# - Workflows load without errors
# - Steps execute in correct order
# - Context passes between steps
# - Error handlers work
# - Timeouts are respected
```

---

## 📝 Notes

- Workflows are JSON files in `.openagents/workflows/`
- Use descriptive IDs and descriptions
- Set reasonable timeouts (2-5 minutes per step)
- Add error handlers for critical steps
- Use `input` to pass context between steps
- Mix OpenCode and OpenAgents agents

---

## 🔗 Related Files

- `src/workflow/types.ts` - Workflow type definitions
- `src/workflow/validator.ts` - Workflow validation
- `docs/workflow/WORKFLOW-GUIDE.md` - Complete workflow guide

---

## ⏭️ Next Task

After completing this task, proceed to:
- `04-test-and-validate.md` - Test workflows with real agents

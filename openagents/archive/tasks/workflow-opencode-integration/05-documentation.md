# Task 05: Documentation

**Estimated Time:** 1 hour  
**Priority:** Medium  
**Status:** ⏳ Pending  
**Depends On:** Tasks 01-04

---

## 🎯 Objective

Create comprehensive documentation for the workflow system, including guides, examples, and troubleshooting.

---

## 📋 Documentation Checklist

### 1. Update Main README
**File:** `README.md`

Add workflow section:
```markdown
## Workflows

OpenAgents includes a powerful workflow system for orchestrating multiple agents.

### Quick Start

1. Create a workflow in `.openagents/workflows/my-workflow.json`
2. Run with `/workflow my-workflow`

See [Workflow Guide](./docs/workflow/WORKFLOW-GUIDE.md) for details.

### Example Workflows

- `feature` - Plan → Build → Test
- `analyze` - Research → Review
- `refactor` - Analyze → Plan → Execute → Validate → Review
```

---

### 2. Create User Guide
**File:** `docs/workflow/USER-GUIDE.md`

```markdown
# Workflow User Guide

## What are Workflows?

Workflows allow you to orchestrate multiple agents in sequence, passing context between steps.

## Running Workflows

\`\`\`bash
/workflow <workflow-name> [args...]
\`\`\`

## Creating Workflows

Create a JSON file in `.openagents/workflows/`:

\`\`\`json
{
  "id": "my-workflow",
  "description": "My workflow",
  "steps": [
    {
      "id": "step1",
      "type": "agent",
      "agent": "plan",
      "next": "step2"
    },
    {
      "id": "step2",
      "type": "agent",
      "agent": "build",
      "input": "step1"
    }
  ]
}
\`\`\`

## Step Types

### Agent Steps
Execute an agent with context from previous steps.

### Transform Steps
Transform data between steps.

### Condition Steps
Conditional routing based on data.

## Best Practices

1. Keep workflows focused
2. Use descriptive IDs
3. Set reasonable timeouts
4. Add error handlers
5. Test incrementally
```

---

### 3. Update Integration Guide
**File:** `docs/workflow/INTEGRATION-GUIDE.md`

Add OpenCode SDK section:
```markdown
## OpenCode SDK Integration

The workflow system uses OpenCode SDK to execute agents via sessions.

### How It Works

1. **Session Creation** - Creates a session for each agent step
2. **Prompt Sending** - Sends prompt with context to session
3. **Completion Waiting** - Polls session status until complete
4. **Result Extraction** - Extracts result from session messages
5. **Cleanup** - Deletes session after completion

### Agent Configuration

Agents automatically use their configured:
- Tools (read, write, bash, etc.)
- MCPs (Model Context Protocol servers)
- Model settings (temperature, max tokens, etc.)

No additional configuration needed!

### Session Lifecycle

\`\`\`
Create Session → Send Prompt → Poll Status → Extract Result → Cleanup
\`\`\`

### Performance

- Session creation: ~1-2 seconds
- Execution: Depends on agent complexity
- Cleanup: ~100ms

For faster execution, consider parallel workflows (coming soon).
```

---

### 4. Create Troubleshooting Guide
**File:** `docs/workflow/TROUBLESHOOTING.md`

```markdown
# Workflow Troubleshooting

## Common Issues

### Workflow Not Found
**Error:** `Workflow 'name' not found`

**Solution:**
1. Check file exists: `.openagents/workflows/name.json`
2. Check JSON is valid
3. Check file permissions

### Agent Not Found
**Error:** `Agent 'name' not found`

**Solution:**
1. Check agent is registered
2. Check agent name spelling
3. List available agents with resolver

### Session Creation Failed
**Error:** `Failed to create session`

**Solution:**
1. Check OpenCode is running
2. Check agent configuration
3. Check network connectivity

### Workflow Timeout
**Error:** `Session timed out after 5 minutes`

**Solution:**
1. Increase timeout in workflow
2. Check agent is responding
3. Check for infinite loops

### Context Not Passing
**Issue:** Steps don't receive previous results

**Solution:**
1. Add `input` field to step
2. Check previous step completed successfully
3. Check result extraction

### Tools Not Working
**Issue:** Agent can't use tools

**Solution:**
1. Check agent tool configuration
2. Check tool permissions
3. Check tool is available

## Debug Mode

Enable debug logging:
\`\`\`json
{
  "debug": true,
  "trace": true
}
\`\`\`

## Getting Help

1. Check logs in console
2. Check session status in OpenCode
3. Test with simple workflow first
4. Ask in OpenCode Discord
```

---

### 5. Create Examples Document
**File:** `docs/workflow/EXAMPLES.md`

```markdown
# Workflow Examples

## Example 1: Simple Sequential

\`\`\`json
{
  "id": "simple",
  "steps": [
    { "id": "plan", "agent": "plan", "next": "build" },
    { "id": "build", "agent": "build", "input": "plan" }
  ]
}
\`\`\`

## Example 2: With Error Handling

\`\`\`json
{
  "id": "with-errors",
  "steps": [
    {
      "id": "risky",
      "agent": "build",
      "max_retries": 3,
      "on_error": "recovery"
    },
    {
      "id": "recovery",
      "agent": "plan",
      "next": "risky"
    }
  ]
}
\`\`\`

## Example 3: With Timeouts

\`\`\`json
{
  "id": "with-timeouts",
  "steps": [
    {
      "id": "quick",
      "agent": "plan",
      "timeout_ms": 60000,
      "next": "slow"
    },
    {
      "id": "slow",
      "agent": "build",
      "timeout_ms": 300000
    }
  ]
}
\`\`\`

## Example 4: Mixed Agents

\`\`\`json
{
  "id": "mixed",
  "steps": [
    { "id": "research", "agent": "researcher", "next": "plan" },
    { "id": "plan", "agent": "plan", "input": "research", "next": "build" },
    { "id": "build", "agent": "coder", "input": "plan", "next": "review" },
    { "id": "review", "agent": "reviewer", "input": "build" }
  ]
}
\`\`\`
```

---

### 6. Update CHANGELOG
**File:** `CHANGELOG.md`

```markdown
## [0.2.0] - 2024-12-18

### Added
- Workflow system with OpenCode SDK integration
- `/workflow` command to run workflows
- OpenCodeAgentExecutor for session-based agent execution
- Example workflows (feature, analyze, refactor)
- Workflow documentation and guides

### Changed
- Plugin now creates AgentResolver with OpenCode agents
- Plugin now creates WorkflowExecutor with registered executors

### Fixed
- Agent resolution now includes OpenCode built-in agents
```

---

## ✅ Acceptance Criteria

- [ ] README.md updated with workflow section
- [ ] USER-GUIDE.md created
- [ ] INTEGRATION-GUIDE.md updated
- [ ] TROUBLESHOOTING.md created
- [ ] EXAMPLES.md created
- [ ] CHANGELOG.md updated
- [ ] All documentation is clear and accurate
- [ ] Examples are tested and working
- [ ] Links between documents work
- [ ] Formatting is consistent

---

## 📝 Documentation Standards

### Style Guide
- Use clear, concise language
- Include code examples
- Add visual diagrams where helpful
- Use consistent formatting
- Link related documents

### Code Examples
- Test all code examples
- Include expected output
- Show both success and error cases
- Use realistic scenarios

### Structure
- Start with overview
- Provide quick start
- Include detailed reference
- Add troubleshooting
- Link to related docs

---

## 🔗 Related Files

- `README.md` - Main README
- `docs/workflow/*.md` - Workflow documentation
- `CHANGELOG.md` - Change log
- `.openagents/workflows/README.md` - Workflow directory README

---

## ⏭️ Next Steps

After completing this task:
1. Review all documentation for accuracy
2. Test all examples
3. Get feedback from users
4. Update based on feedback
5. Consider adding video tutorials
6. Consider adding interactive examples

---

## 🎉 Completion

Once all documentation is complete:
- [ ] All files created/updated
- [ ] All examples tested
- [ ] All links verified
- [ ] Formatting consistent
- [ ] Ready for users

**Congratulations! The workflow OpenCode integration is complete!** 🚀

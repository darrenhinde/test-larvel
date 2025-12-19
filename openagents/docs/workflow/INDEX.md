# Workflow Documentation Index

## 🚀 Start Here

**New to workflows?** Start with [QUICK-START.md](./QUICK-START.md)

**Want complete reference?** See [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md)

**Need to integrate?** See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)

## 📚 Documentation Map

### For Users

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [QUICK-START.md](./QUICK-START.md) | Get started in 5 minutes | 5 min |
| [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md) | Complete workflow reference | 20 min |
| [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md) | How agents work | 15 min |
| [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md) | Multi-source agents | 10 min |

### For Developers

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) | OpenCode integration | 30 min |
| [SPECIFICATION.md](./SPECIFICATION.md) | Technical spec | 45 min |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Development roadmap | 20 min |

### Progress Reports

| Document | Purpose |
|----------|---------|
| [PHASE-1-COMPLETE.md](./PHASE-1-COMPLETE.md) | Foundation (66 tests) |
| [PHASE-2-COMPLETE.md](./PHASE-2-COMPLETE.md) | Execution (87 tests) |

## 🎯 By Use Case

### "I want to create my first workflow"
1. Read [QUICK-START.md](./QUICK-START.md)
2. Copy an example from the guide
3. Modify for your needs

### "I want to understand how agents work"
1. Read [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md)
2. Read [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md)
3. Check your `.openagents/agents/` directory

### "I want to integrate workflows with OpenCode"
1. Read [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)
2. Implement `AgentExecutor`
3. Implement `UIManager`
4. Register with plugin

### "I want to understand the architecture"
1. Read [SPECIFICATION.md](./SPECIFICATION.md)
2. Read [IMPLEMENTATION.md](./IMPLEMENTATION.md)
3. Review source code in `src/workflow/`

### "I want to contribute"
1. Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for roadmap
2. Check Phase 3 tasks
3. Pick a task and implement

## 📖 Reading Order

### Beginner Path
1. [QUICK-START.md](./QUICK-START.md) - Get started
2. [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md) - Learn features
3. [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md) - Understand agents

### Advanced Path
1. [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md) - Multi-source agents
2. [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) - Integration
3. [SPECIFICATION.md](./SPECIFICATION.md) - Deep dive

### Contributor Path
1. [PHASE-1-COMPLETE.md](./PHASE-1-COMPLETE.md) - What's done
2. [PHASE-2-COMPLETE.md](./PHASE-2-COMPLETE.md) - Current state
3. [IMPLEMENTATION.md](./IMPLEMENTATION.md) - What's next

## 🔍 Quick Reference

### Workflow Structure
```json
{
  "id": "workflow-id",
  "description": "What it does",
  "steps": [
    { "id": "step1", "type": "agent", "agent": "name", "next": "step2" }
  ]
}
```

### Agent Sources
- **OpenAgents**: `.openagents/agents/*.md`
- **OpenCode**: `plan`, `build`, `test`, `review`
- **Plugins**: From other OpenCode plugins

### Step Types
- `agent` - Execute an agent
- `transform` - Transform data
- `condition` - Conditional routing
- `approval` - Human approval (future)
- `parallel` - Parallel execution (future)

## 📊 Status

| Phase | Status | Tests | Documentation |
|-------|--------|-------|---------------|
| Phase 1: Foundation | ✅ Complete | 66 passing | ✅ Complete |
| Phase 2: Execution | ✅ Complete | 87 passing | ✅ Complete |
| Phase 3: Advanced | 🚧 Next | - | 📝 Planned |

## 🎓 Learning Resources

### Examples
- `examples/workflow-basic.ts` - Working example
- `.openagents/workflows/` - Example workflows
- Each doc has inline examples

### Tests
- `src/workflow/**/*.test.ts` - Unit tests
- Show real usage patterns
- 87 tests = 87 examples!

### Source Code
- `src/workflow/` - Implementation
- Well-commented
- TypeScript types as documentation

## 🆘 Getting Help

### Common Questions

**Q: How do I create a workflow?**  
A: See [QUICK-START.md](./QUICK-START.md)

**Q: How do agents work?**  
A: See [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md)

**Q: Can I use OpenCode's built-in agents?**  
A: Yes! See [AGENT-RESOLUTION.md](./AGENT-RESOLUTION.md)

**Q: How do I integrate with OpenCode?**  
A: See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)

**Q: What's the architecture?**  
A: See [SPECIFICATION.md](./SPECIFICATION.md)

### Troubleshooting

See the "Troubleshooting" section in:
- [QUICK-START.md](./QUICK-START.md) - Common issues
- [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md) - Detailed solutions
- [AGENT-INTEGRATION.md](./AGENT-INTEGRATION.md) - Agent issues

## 📝 Document Summaries

### QUICK-START.md
5-minute guide to creating your first workflow. Includes common patterns and quick troubleshooting.

### WORKFLOW-GUIDE.md
Complete reference for workflows. Covers all step types, context management, error handling, limitations, and best practices.

### AGENT-INTEGRATION.md
Explains how agents are loaded, configured, and executed. Covers global vs project-local agents.

### AGENT-RESOLUTION.md
Details the multi-source agent resolution system. Shows how to use OpenCode built-in agents and override them.

### IMPLEMENTATION-GUIDE.md
Step-by-step guide to integrating workflows with OpenCode. Includes code examples and testing.

### SPECIFICATION.md
Complete technical specification. Defines all types, interfaces, and behaviors.

### IMPLEMENTATION.md
Development roadmap with 6 phases and 32 tasks. Shows what's done and what's next.

### PHASE-1-COMPLETE.md
Phase 1 completion report. Foundation with 66 tests.

### PHASE-2-COMPLETE.md
Phase 2 completion report. Execution engine with 87 tests.

## 🎯 Next Steps

1. **Start with [QUICK-START.md](./QUICK-START.md)**
2. **Try the examples**
3. **Read deeper as needed**
4. **Build your workflows!**

---

**Questions?** Check the relevant guide above or review the source code in `src/workflow/`

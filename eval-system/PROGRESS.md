# Eval System - Progress Log

## ✅ Phase 1: MVP - Complete!

### What We Built:
1. **Project Foundation**
   - Package setup with @opencode-ai/sdk
   - TypeScript configuration
   - Bun as runtime

2. **Core Types** (`src/types.ts`)
   - `SimpleTest` - Test definition with optional agent support
   - `ToolCall` - Captured tool execution
   - `EvalContext` - Session data and events
   - `TestResult` - Pass/fail with metrics

3. **Test Runner** (`src/runner.ts`)
   - Server lifecycle management (start/stop)
   - Event stream monitoring
   - Tool call detection
   - Session idle detection
   - **Custom agent file management**:
     - `setupAgent()` - Reference existing `.opencode/agent/*.md` or copy test agents
     - `cleanupAgents()` - Remove copied test agents after tests
     - Supports both existing OpenCode agents and test-specific agents
     - Automatic directory creation

4. **Examples**
   - `simple-test.ts` - Basic tool detection
   - `custom-agent-test.ts` - Test-specific agent from fixtures
   - `existing-agent-test.ts` - Using existing OpenCode agents
   - `test-writer.md` - Example test agent

### Key Features:
✅ Start/stop OpenCode server programmatically
✅ Capture tool calls from event stream  
✅ Validate expected tools were used
✅ **Load custom agents from any directory**
✅ **Automatic agent setup and cleanup**
✅ **Organize test agents separately from OpenCode config**
✅ Pass/fail results with timing

### How Custom Agents Work:

**Option 1: Use existing OpenCode agent**
```typescript
const test = {
  agentFile: "./.opencode/agent/codebase-agent.md",
  agentName: "codebase-agent"
};
// Runner uses existing agent directly (no copying)
```

**Option 2: Test-specific agent**
```typescript
// 1. Store test agents in fixtures/
fixtures/agents/my-test-agent.md

// 2. Reference in test
const test = {
  agentFile: "./fixtures/agents/my-test-agent.md",
  agentName: "my-test-agent"
};

// 3. Runner handles the rest:
// - Copies to .opencode/agent/
// - OpenCode loads it
// - Test runs
// - File cleaned up
```

### Benefits:
- ✅ Test with existing OpenCode agents (no copying needed)
- ✅ Create isolated test agents for specific scenarios
- ✅ Test different agent configurations easily
- ✅ Version control your test agents
- ✅ Share test agents across projects
- ✅ No manual file management
- ✅ Clean test isolation
- ✅ Automatic cleanup of test agents only

## ✅ Phase 2: Pattern Matching - Complete!

### What We Built:
1. **Enhanced Types** (`src/types.ts`)
   - `BehavioralPattern` - Tool sequences, wildcards, frequency, timing
   - `OutputPattern` - File validation, content checking, response validation
   - `PerformancePattern` - Duration limits, efficiency metrics, benchmarking
   - `ErrorPattern` - Failure handling, recovery testing
   - `TestExpectations` - Combined pattern validation
   - `ValidationResult` - Detailed validation results
   - Enhanced `EvalContext` with full tool details, messages, file changes, errors

2. **Pattern Matchers** (`src/matchers/index.ts`)
   - `PatternMatcher.matchBehavioral()` - Validates tool usage patterns
     - Exact sequences: `["read", "edit", "write"]`
     - Wildcards: `"read* edit+ write?"` (* = 0+, + = 1+, ? = 0-1)
     - Must call / must not call validation
     - Call frequency limits (min/max)
     - Per-tool duration limits
   - `PatternMatcher.matchOutput()` - Validates outputs
     - File creation/modification/deletion
     - File content checking (contains, regex, line count)
     - Response content validation
   - `PatternMatcher.matchPerformance()` - Validates efficiency
     - Duration limits
     - Tool call limits
     - Redundant operation detection
     - Benchmarking (fasterThan, fewerToolsThan)
   - `PatternMatcher.matchError()` - Validates error handling
     - Expected failures
     - Error recovery
     - Graceful degradation

3. **Enhanced Runner** (`src/runner.ts`)
   - Captures full tool details (args, output, metadata, duration)
   - Tracks messages (user and assistant)
   - Monitors file changes
   - Captures errors with timestamps
   - Validates expectations using pattern matchers
   - Backward compatible with Phase 1 simple tests
   - Support for file attachments in prompts

4. **Example Tests** (`examples/pattern-tests.ts`)
   - Behavioral pattern examples (sequences, wildcards, frequency)
   - Output pattern examples (file content validation)
   - Performance pattern examples (duration, efficiency)
   - Combined pattern examples (full validation)
   - Test summary reporting

### Key Features:
✅ Tool sequence validation with wildcards
✅ File content and response validation
✅ Performance and efficiency metrics
✅ Error handling validation
✅ Custom validators support
✅ Enhanced context capture (tools, messages, files, errors)
✅ Backward compatible with Phase 1
✅ Comprehensive example tests

### Usage:
```bash
# Run pattern matching tests
bun run test:patterns
```

### Example:
```typescript
const test = {
  name: "Full validation",
  prompt: "Create factorial.ts with tests",
  expectations: {
    behavioral: {
      type: "behavioral",
      minCalls: { write: 2 },
    },
    output: {
      type: "output",
      filesCreated: [
        { path: "factorial.ts", contains: ["factorial"] },
        { path: "factorial.test.ts", contains: ["test"] },
      ],
    },
    performance: {
      type: "performance",
      maxDuration: 30000,
      noRedundantReads: true,
    },
  },
};
```

## 🎯 Next Steps (Phase 3):

### Permission/Approval Testing
- Permission request tracking
- Approval strategy configuration
- Permission pattern validation

### Advanced Features
- Batch test running
- JSON result export
- Test discovery and filtering
- CI/CD integration

### Polish
- Performance benchmarking suite
- Test result reporting
- CLI interface
- Multi-session tests

## Usage:

```bash
# Basic test (default agent)
bun run test

# Test-specific agent from fixtures
bun run test:agent

# Existing OpenCode agent
bun run test:existing
```

## Requirements:
⚠️  Need OpenCode configured with LLM provider (Anthropic, OpenAI, etc.)

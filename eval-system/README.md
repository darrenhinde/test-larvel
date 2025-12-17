# Eval System for OpenCode

Comprehensive evaluation framework for testing OpenCode agent behavior.

## Features

**Phase 1: Simple Tool Detection** ✅
- Start OpenCode server programmatically
- Send prompts to agents
- Capture tool calls from events
- Validate expected tools were used
- Custom agent management

**Phase 2: Pattern Matching** ✅
- Behavioral patterns (tool sequences, frequency, wildcards)
- Output patterns (file content validation, response checking)
- Performance patterns (duration limits, efficiency metrics)
- Error patterns (failure handling, recovery testing)
- Custom validators

## Setup Requirements

**IMPORTANT**: You must have OpenCode configured with an LLM provider (Anthropic, OpenAI, etc.) for tests to work.

Check your OpenCode config:
```bash
cat ~/.config/opencode/opencode.json
```

You should see provider configuration like:
```json
{
  "provider": {
    "anthropic": {
      "apiKey": "your-key-here"
    }
  }
}
```

## Usage

```bash
# Basic test (default agent)
bun run test

# Custom test agent
bun run test:agent

# Existing OpenCode agent
bun run test:existing

# Pattern matching tests (Phase 2)
bun run test:patterns
```

## Example Tests

### Basic Test (Phase 1)
```typescript
import { SimpleEvalRunner } from "./src/runner.js";

const test = {
  name: "Create a hello.txt file",
  prompt: "Create a file called hello.txt with the text 'Hello World'",
  expectedTool: "write", 
};

const runner = new SimpleEvalRunner(process.cwd());
await runner.start();

const result = await runner.runTest(test);
console.log(result.passed ? "✅ PASS" : "❌ FAIL");

await runner.stop();
```

### Pattern Matching Tests (Phase 2)

**Behavioral Pattern - Tool Sequence:**
```typescript
const test = {
  name: "Must read before editing",
  prompt: "Fix bugs in app.ts",
  expectations: {
    behavioral: {
      type: "behavioral",
      toolPattern: "read edit+",  // Must read, then edit one or more times
      mustNotCall: ["write"],     // Should edit, not create new file
    },
  },
};
```

**Output Pattern - File Content:**
```typescript
const test = {
  name: "Create TypeScript interface",
  prompt: "Create a User interface with name and email",
  expectations: {
    output: {
      type: "output",
      filesCreated: [{
        path: "User.ts",
        contains: ["interface", "User", "name", "email"],
        minLines: 3,
      }],
    },
  },
};
```

**Performance Pattern - Efficiency:**
```typescript
const test = {
  name: "Search efficiently",
  prompt: "Find all TODO comments",
  expectations: {
    behavioral: {
      type: "behavioral",
      mustCall: ["grep"],         // Should use grep, not read every file
      mustNotCall: ["read"],
    },
    performance: {
      type: "performance",
      maxDuration: 5000,           // Must complete in 5 seconds
      maxToolCalls: 3,             // Should be efficient
      noRedundantReads: true,      // Don't read same file twice
    },
  },
};
```

**Combined Patterns:**
```typescript
const test = {
  name: "Full validation",
  prompt: "Create factorial.ts with tests",
  expectations: {
    behavioral: {
      type: "behavioral",
      minCalls: { write: 2 },      // Should create 2 files
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
    },
  },
};
```

### Custom Agent Test

**Option 1: Use existing OpenCode agent**
```typescript
import { SimpleEvalRunner } from "./src/runner.js";

const test = {
  name: "Test with codebase agent",
  prompt: "Create a module with proper types",
  expectedTool: "write",
  agentFile: "./.opencode/agent/codebase-agent.md",
  agentName: "codebase-agent"
};

const runner = new SimpleEvalRunner(process.cwd());
await runner.start();
const result = await runner.runTest(test);
await runner.stop();
```

**Option 2: Use test-specific agent from fixtures**
```typescript
const test = {
  name: "Test with test agent",
  prompt: "Create test.txt",
  expectedTool: "write",
  agentFile: "./fixtures/agents/test-writer.md",
  agentName: "test-writer"
};
```

**How it works:**
1. **Existing agents**: Point to `.opencode/agent/*.md` files directly (no copying)
2. **Test agents**: Store in `fixtures/agents/` and runner copies them to `.opencode/agent/`
3. OpenCode loads and uses your specified agent
4. Test agents are cleaned up after the test (existing agents are left alone)

**Agent paths:**
- OpenCode: `.opencode/agent/` (singular)
- Claude Code: `.claude/agents/` (plural)

This lets you:
- Test with your existing OpenCode agents
- Create isolated test agents for specific scenarios
- Version control test agents separately
- Share test configurations across projects

## OpenCode vs Claude Code

This eval system is designed for **OpenCode** and uses `.opencode/agents/` for agent loading.

If you need **Claude Code compatibility**, you can extend the runner to copy agents to both locations:
- OpenCode: `.opencode/agents/`  
- Claude Code: `.claude/agents/`

## Pattern Types

### Behavioral Patterns
Test HOW the agent works:
- `toolSequence` - Exact tool order: `["read", "edit", "write"]`
- `toolPattern` - Wildcards: `"read* edit+ write?"` (* = zero or more, + = one or more, ? = zero or one)
- `mustCall` / `mustNotCall` - Required/forbidden tools
- `maxCalls` / `minCalls` - Tool frequency limits
- `maxToolDuration` - Per-tool timing limits

### Output Patterns
Test WHAT the agent produces:
- `filesCreated` - File existence, content, line count
- `filesModified` / `filesDeleted` - File changes
- `responseContains` / `responseMatches` - Response validation
- `noLinterErrors` / `noTypeErrors` - Code quality

### Performance Patterns
Test efficiency:
- `maxDuration` - Total time limit
- `maxToolCalls` - Tool usage limit
- `noRedundantReads` / `noRedundantEdits` - Efficiency checks
- `fasterThan` / `fewerToolsThan` - Benchmarking

### Error Patterns
Test failure handling:
- `shouldFail` - Expect task to fail
- `shouldRecover` - Expect recovery from errors
- `expectedErrors` - Specific errors to expect
- `noUnhandledErrors` - No unexpected errors
- `gracefulDegradation` - Partial solution on failure

## What's Next?

Future enhancements:
- Permission/approval testing
- Multi-session tests
- Test discovery and filtering
- JSON result export
- CI/CD integration
- Performance benchmarking suite

## Current Status

**Phase 1 - MVP** ✅
- Project structure set up
- Basic types defined  
- Simple runner implemented
- Event capture working
- Custom agent file management
- Support for existing OpenCode agents
- Support for test-specific agents
- Agent setup/cleanup automation

**Phase 2 - Pattern Matching** ✅
- Behavioral pattern validation
- Output pattern validation
- Performance pattern validation
- Error pattern validation
- Custom validators
- Enhanced context capture
- Example tests

⏳ **Needs LLM provider configured to run tests**

## Project Structure

```
eval-system/
├── src/
│   ├── types.ts                    # Type definitions (Phase 1 + 2)
│   ├── runner.ts                   # Test runner with pattern matching
│   └── matchers/
│       └── index.ts                # Pattern matcher implementations
├── examples/
│   ├── simple-test.ts              # Basic test example (Phase 1)
│   ├── custom-agent-test.ts        # Test-specific agent
│   ├── existing-agent-test.ts      # Using existing OpenCode agents
│   └── pattern-tests.ts            # Pattern matching examples (Phase 2)
├── fixtures/
│   └── agents/
│       └── test-writer.md          # Example test agent
├── package.json
├── tsconfig.json
├── README.md
└── PROGRESS.md
```

## Agent Paths

- **OpenCode**: `.opencode/agent/` (singular) ✅ Supported
- **Claude Code**: `.claude/agents/` (plural) - Can be added if needed

The runner automatically detects if you're referencing an existing OpenCode agent and uses it directly without copying.

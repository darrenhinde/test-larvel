# Temp Environment System - Simple Test

## What We Built

A minimal eval system that:
1. Creates isolated temp directories (`.tmp/evals/opencode-eval-{timestamp}-{seed}/`)
2. Uses a plugin to capture tool calls
3. Runs ONE simple test to verify assumptions

## Structure

```
.tmp/evals/opencode-eval-{timestamp}-{seed}/
├── .opencode/
│   ├── agent/
│   │   └── simple-writer.md      # Copied from test fixtures
│   ├── plugin/
│   │   ├── package.json           # Points to eval plugin
│   │   └── eval-plugin.js         # Loads our monitoring plugin
│   └── config.json                # Points to "simple-writer" agent
└── [agent can create files here]
```

## Key Components

### 1. Eval Plugin (`src/plugin/eval-plugin.ts`)
```typescript
- Hooks into tool.execute.before/after
- Captures: tool name, args, output, duration
- Auto-approves permissions
- Stores data in EvalMonitor
```

### 2. Temp Environment (`src/temp-env.ts`)
```typescript
- Creates isolated directory
- Copies agent files
- Sets up plugin
- Creates config.json
- Cleanup after test
```

### 3. EvalMonitor (global)
```typescript
globalThis.__evalMonitor = new EvalMonitor();
// Plugin reads from this to capture data
```

## How It Works

**Step 1: Setup**
```typescript
const tempEnv = new TempEnvironment(process.cwd());
const monitor = new EvalMonitor();
globalThis.__evalMonitor = monitor;  // Plugin will find this

await tempEnv.setup({
  baseDir: process.cwd(),
  agentFile: "./test-fixtures/simple-agent/simple-writer.md",
  agentName: "simple-writer",
});
```

**Step 2: Start OpenCode**
```typescript
const server = await createOpencodeServer({});
// Server finds .opencode/ in temp directory
// Loads our plugin automatically
```

**Step 3: Send Prompt**
```typescript
await client.session.prompt({
  body: {
    parts: [{ type: "text", text: "Create a file..." }],
    agent: "simple-writer",
  },
  query: { directory: tempEnv.getWorkingDirectory() },
});
```

**Step 4: Capture Tools**
```typescript
const tools = monitor.getTools();
// [{ tool: "write", args: {...}, duration: 120, ... }]
```

**Step 5: Cleanup**
```typescript
await tempEnv.cleanup();
// Removes entire temp directory
```

## Run the Test

```bash
# This requires OpenCode configured with an API key
bun run test:temp
```

## What We're Testing

1. ✅ Temp directory creation works
2. ✅ Plugin gets loaded by OpenCode
3. ✅ Tool calls are captured
4. ✅ Agent file copying works
5. ✅ Cleanup removes temp directory

## Expected Output

```
🧪 Starting Simple Eval Test
============================================================
📁 Creating temp environment: .../opencode-eval-1734464123-abc123
   📋 Copying agent: simple-writer.md
   🔌 Eval plugin configured
   ⚙️  Created config.json with agent: simple-writer
   ✅ Temp environment ready

📂 Working directory: .../opencode-eval-1734464123-abc123
🚀 Starting OpenCode server...
✅ Server started at http://localhost:XXXXX

🔍 Eval plugin loaded for directory: ...
📝 Creating session and sending prompt...
   ⏳ Waiting for session to complete...
   🔧 Tool starting: write
   ✅ Tool completed: write (120ms)

📊 Captured tool calls:
   ✅ write (120ms)
      Args: {"filePath":"test.txt",...}

🎯 Test Summary:
   Tools executed: 1
   Session status: Completed
   Write tool called: ✅ YES

🛑 Server stopped
🧹 Temp environment cleaned up
============================================================
✅ Test completed successfully!
```

## Next Steps

Once this works:
1. Integrate with pattern matchers
2. Support multiple tests
3. Support complete .opencode directories
4. Add better reporting

## Important Notes

⚠️ **Requires OpenCode configured with LLM provider** (Anthropic, OpenAI, etc.)

⚠️ **Plugin path resolution** - The plugin uses `../../../src/plugin/eval-plugin.js` to find our code. This works because:
- Plugin is in: `.tmp/evals/.../opencode/plugin/eval-plugin.js`
- Resolves to: `eval-system/src/plugin/eval-plugin.js`

⚠️ **Global state** - We use `globalThis.__evalMonitor` to share state between our test code and the plugin running in OpenCode's context.

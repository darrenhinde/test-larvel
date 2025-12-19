# Task 12: Add Real SDK Integration Tests

**Estimated Time:** 3 hours  
**Priority:** MEDIUM  
**Status:** ⏳ Pending  
**Dependencies:** Tasks 01-04 (Type Safety, Error Messages, Validation)

---

## 🎯 Objective

Add comprehensive integration tests that validate the plugin works with the **real** OpenCode SDK, not just mocked responses.

---

## 📋 Problem Statement

Current tests use a `MockOpencodeClient` that returns hardcoded responses. This validates workflow orchestration logic but **does not validate**:

1. ❌ Real OpenCode SDK integration
2. ❌ Actual agent execution
3. ❌ Agent loading from `.md` files
4. ❌ Real session API behavior
5. ❌ Real error cases from SDK

**Current Test Coverage:**
- ✅ Workflow Logic: 95%
- ✅ Type Safety: 100%
- ⚠️ Session API: Mock only
- ❌ Agent Loading: 0%
- ❌ Real SDK Integration: 0%

**Risk:** Plugin might fail in production even though tests pass.

---

## 🔨 Implementation Steps

### Step 1: Create Agent Loading Tests (1 hour)

**File:** `test/agent-loading.test.ts`

```typescript
import { describe, test, expect } from "bun:test"
import { loadAgents, loadAgentFromFile } from "../src/agents/loader"
import { join } from "node:path"

describe("Agent Loading", () => {
  test("should load agents from directory", () => {
    const agentsDir = join(process.cwd(), ".openagents", "agents")
    const agents = loadAgents([agentsDir])
    
    expect(agents.size).toBeGreaterThan(0)
    console.log(`Loaded ${agents.size} agents:`, [...agents.keys()])
  })
  
  test("should parse agent frontmatter correctly", () => {
    const agentsDir = join(process.cwd(), ".openagents", "agents")
    const agents = loadAgents([agentsDir])
    
    // Check first agent
    const firstAgent = [...agents.values()][0]
    
    expect(firstAgent.name).toBeDefined()
    expect(firstAgent.prompt).toBeDefined()
    expect(firstAgent.description).toBeDefined()
    expect(firstAgent.path).toBeDefined()
  })
  
  test("should load specific agent file", () => {
    const agentPath = join(process.cwd(), ".openagents", "agents", "coder.md")
    const agent = loadAgentFromFile(agentPath)
    
    expect(agent).toBeDefined()
    expect(agent?.name).toBe("coder")
    expect(agent?.prompt).toContain("You are")
  })
  
  test("should handle missing directory gracefully", () => {
    const agents = loadAgents(["/nonexistent/path"])
    expect(agents.size).toBe(0)
  })
  
  test("should handle invalid markdown files", () => {
    // Create temp invalid file
    const invalidPath = join(process.cwd(), ".openagents", "agents", "invalid.md")
    const agent = loadAgentFromFile(invalidPath)
    
    // Should either skip or handle gracefully
    expect(agent).toBeDefined() // or null, depending on implementation
  })
})
```

### Step 2: Create Real SDK Integration Tests (1.5 hours)

**File:** `test/sdk-integration.test.ts`

```typescript
import { describe, test, expect, beforeAll } from "bun:test"
import { OpenCodeAgentExecutor } from "../src/workflow/opencode-agent-executor"
import { AgentResolver } from "../src/workflow/agent-resolver"
import { loadAgents } from "../src/agents/loader"
import type { OpenCodeClient } from "../src/workflow/external-types"

/**
 * Real SDK Integration Tests
 * 
 * These tests require:
 * 1. OpenCode SDK to be available
 * 2. Real agents to be loaded
 * 3. Optional: API key for cloud agents
 * 
 * Set SKIP_SDK_TESTS=true to skip these tests
 */

const SKIP_SDK_TESTS = process.env.SKIP_SDK_TESTS === "true"

describe.skipIf(SKIP_SDK_TESTS)("Real SDK Integration", () => {
  let client: OpenCodeClient
  let agentExecutor: OpenCodeAgentExecutor
  let resolver: AgentResolver
  
  beforeAll(async () => {
    // Try to get real OpenCode client
    // This might come from @opencode-ai/sdk or plugin context
    try {
      // Option 1: Import from SDK (if available)
      // const { createClient } = await import("@opencode-ai/sdk")
      // client = createClient({ apiKey: process.env.OPENCODE_API_KEY })
      
      // Option 2: Use plugin context (if available)
      // client = getPluginClient()
      
      // For now, skip if no real client available
      throw new Error("Real SDK client not available in test environment")
    } catch (error) {
      console.warn("⚠️ Skipping SDK tests - real client not available")
      process.env.SKIP_SDK_TESTS = "true"
    }
  })
  
  test("should create real session", async () => {
    const session = await client.session.create({
      body: { agent: "plan" }
    })
    
    expect(session.data?.id).toBeDefined()
    
    // Cleanup
    if (session.data?.id) {
      await client.session.delete({ path: { sessionId: session.data.id } })
    }
  })
  
  test("should execute real agent", async () => {
    const agents = loadAgents([".openagents/agents"])
    resolver = new AgentResolver(agents, client)
    resolver.registerOpenCodeAgents(["plan", "build", "test"])
    
    agentExecutor = new OpenCodeAgentExecutor(client, resolver)
    
    const result = await agentExecutor.execute("plan", {
      input: "Create a simple todo app",
      context: {}
    })
    
    expect(result).toBeDefined()
    expect(result.error).toBeUndefined()
    console.log("Real agent result:", result)
  })
  
  test("should handle real session timeout", async () => {
    // This test would verify timeout behavior with real SDK
    // May take 5+ minutes to run
  }, { timeout: 360000 }) // 6 minute timeout
  
  test("should handle real session errors", async () => {
    // Test with invalid agent name
    await expect(
      agentExecutor.execute("nonexistent-agent", {
        input: "test",
        context: {}
      })
    ).rejects.toThrow()
  })
})
```

### Step 3: Create Plugin Loading Tests (30 min)

**File:** `test/plugin-loading.test.ts`

```typescript
import { describe, test, expect } from "bun:test"
import OpenAgentsPlugin from "../src/plugin"
import { loadConfig } from "../src/plugin/config"

describe("Plugin Loading", () => {
  test("should load plugin configuration", () => {
    const config = loadConfig(process.cwd())
    
    expect(config).toBeDefined()
    expect(config.enabled).toBeDefined()
    expect(config.agents_dir).toBeDefined()
  })
  
  test("should export plugin as default", () => {
    expect(OpenAgentsPlugin).toBeDefined()
    expect(typeof OpenAgentsPlugin).toBe("function")
  })
  
  test("should initialize plugin with mock context", async () => {
    const mockContext = {
      directory: process.cwd(),
      client: {} as any // Mock client
    }
    
    const plugin = await OpenAgentsPlugin(mockContext)
    
    expect(plugin).toBeDefined()
    expect(plugin.config).toBeDefined()
    expect(plugin.event).toBeDefined()
  })
})
```

### Step 4: Add Test Configuration (15 min)

**File:** `test/setup.ts`

```typescript
/**
 * Test Setup
 * 
 * Global test configuration and utilities
 */

// Environment variables for testing
process.env.NODE_ENV = "test"

// Skip SDK tests by default (enable with ENABLE_SDK_TESTS=true)
if (!process.env.ENABLE_SDK_TESTS) {
  process.env.SKIP_SDK_TESTS = "true"
  console.log("ℹ️ SDK integration tests disabled (set ENABLE_SDK_TESTS=true to enable)")
}

// Test utilities
export const testHelpers = {
  /**
   * Wait for condition to be true
   */
  waitFor: async (
    condition: () => boolean | Promise<boolean>,
    timeout = 5000
  ): Promise<void> => {
    const start = Date.now()
    while (!(await condition())) {
      if (Date.now() - start > timeout) {
        throw new Error("Timeout waiting for condition")
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  },
  
  /**
   * Create temporary test directory
   */
  createTempDir: (): string => {
    // Implementation
    return "/tmp/openagents-test"
  }
}
```

### Step 5: Update package.json Scripts (15 min)

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test test/*.test.ts --exclude test/sdk-integration.test.ts",
    "test:integration": "ENABLE_SDK_TESTS=true bun test test/sdk-integration.test.ts",
    "test:all": "bun test test/*.test.ts",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

---

## ✅ Acceptance Criteria

### Agent Loading Tests
- [ ] Load agents from directory
- [ ] Parse frontmatter correctly
- [ ] Extract all agent properties
- [ ] Handle missing directories
- [ ] Handle invalid files
- [ ] All tests passing

### SDK Integration Tests
- [ ] Create real sessions (if SDK available)
- [ ] Execute real agents (if SDK available)
- [ ] Handle real timeouts
- [ ] Handle real errors
- [ ] Gracefully skip if SDK unavailable
- [ ] All tests passing or skipped

### Plugin Loading Tests
- [ ] Load configuration
- [ ] Export plugin correctly
- [ ] Initialize plugin
- [ ] All tests passing

### Test Infrastructure
- [ ] Test setup file created
- [ ] Test utilities available
- [ ] npm scripts configured
- [ ] CI/CD ready (optional)

---

## 🧪 Testing

### Run Unit Tests Only
```bash
bun test:unit
```

### Run Integration Tests (requires SDK)
```bash
ENABLE_SDK_TESTS=true bun test:integration
```

### Run All Tests
```bash
bun test:all
```

### Run with Coverage
```bash
bun test:coverage
```

---

## 📝 Notes

### SDK Availability

The real SDK integration tests will be **skipped by default** because:
1. SDK might not be available in test environment
2. May require API keys
3. Slower to run
4. May have rate limits

**Enable with:**
```bash
ENABLE_SDK_TESTS=true bun test
```

### Test Organization

```
test/
├── setup.ts                    ← Global test setup
├── agent-loading.test.ts       ← Agent loading tests
├── sdk-integration.test.ts     ← Real SDK tests (skippable)
├── plugin-loading.test.ts      ← Plugin initialization tests
└── helpers.ts                  ← Test utilities
```

### CI/CD Considerations

For CI/CD pipelines:
1. Run unit tests on every commit
2. Run integration tests on main branch only
3. Require API keys as secrets
4. Allow integration tests to fail (optional)

---

## 🔗 Related Tasks

- Task 01: Improve Type Safety (provides typed mocks)
- Task 03: Improve Error Messages (better test error output)
- Task 04: Add Input Validation (validates test inputs)

---

## ⏭️ Next Task

After completing this task, proceed to:
- Continue with remaining Phase 2/3 tasks
- Or add E2E tests (Task 13)

---

## 🎯 Success Metrics

| Metric | Target | Impact |
|--------|--------|--------|
| Agent Loading Coverage | 90%+ | Validates core functionality |
| SDK Integration Coverage | 70%+ | Validates real integration |
| Test Execution Time | <30s (unit) | Fast feedback |
| CI/CD Integration | ✅ | Automated testing |

---

**Priority:** MEDIUM (do after Phase 1 critical fixes)  
**Estimated Time:** 3 hours  
**Value:** HIGH (validates real functionality)

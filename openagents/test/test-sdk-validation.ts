#!/usr/bin/env bun
/**
 * SDK Integration Validation Tests
 * 
 * Validates that our implementation correctly uses the OpenCode SDK API
 */

import { OpenCodeAgentExecutor } from "../src/workflow/opencode-agent-executor"
import { AgentResolver } from "../src/workflow/agent-resolver"
import type { OpencodeClient, Session, SessionStatus } from "@opencode-ai/sdk"

console.log("\n🧪 SDK Integration Validation Tests\n")
console.log("=".repeat(70))

let testsPassed = 0
let testsFailed = 0

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    console.log(`✅ ${name}`)
    testsPassed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    testsFailed++
  }
}

// Mock client that validates SDK contract
class ValidatingMockClient {
  callLog: string[] = []
  sessions = new Map<string, any>()
  sessionCounter = 0

  session = {
    create: async ({ body }: any) => {
      this.callLog.push(`create:${JSON.stringify(body || {})}`)
      
      if (body && 'agent' in body) {
        throw new Error("SDK Contract Violation: session.create() should not have 'agent' parameter")
      }
      
      const id = `session-${++this.sessionCounter}`
      this.sessions.set(id, { id, status: "busy", messages: [], agent: null })
      
      return {
        data: { id, title: body?.title || "Test", createdAt: new Date().toISOString() } as Session,
        error: undefined,
        request: {} as Request,
        response: {} as Response
      }
    },

    prompt: async ({ path, body }: any) => {
      this.callLog.push(`prompt:${path.id}:${body?.agent || 'no-agent'}`)
      
      if (!body?.parts || !Array.isArray(body.parts)) {
        throw new Error("SDK Contract Violation: session.prompt() requires 'parts' array")
      }
      
      const session = this.sessions.get(path.id)
      if (session) {
        session.agent = body.agent
        session.messages.push(
          { info: { role: "user" }, parts: body.parts },
          { info: { role: "assistant" }, parts: [{ type: "text", text: JSON.stringify({ result: "ok" }) }] }
        )
        session.status = "idle"
      }
      
      return { data: {}, error: undefined, request: {} as Request, response: {} as Response }
    },

    status: async () => {
      this.callLog.push("status")
      const map: Record<string, SessionStatus> = {}
      for (const [id, s] of this.sessions) {
        map[id] = { type: s.status }
      }
      return { data: map, error: undefined, request: {} as Request, response: {} as Response }
    },

    messages: async ({ path }: any) => {
      this.callLog.push(`messages:${path.id}`)
      const session = this.sessions.get(path.id)
      return { 
        data: session?.messages || [], 
        error: undefined, 
        request: {} as Request, 
        response: {} as Response 
      }
    },

    delete: async ({ path }: any) => {
      this.callLog.push(`delete:${path.id}`)
      this.sessions.delete(path.id)
      return { data: true, error: undefined, request: {} as Request, response: {} as Response }
    }
  }
}

// Run tests
async function main() {
  console.log("\n📋 Test Suite 1: SDK API Contract")
  console.log("-".repeat(70))

  await runTest("Session creation should NOT include agent parameter", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    await executor.execute("test-agent", { input: "test", context: {} })
    
    const createCall = client.callLog.find(log => log.startsWith("create:"))
    assert(createCall !== undefined, "session.create should be called")
    assert(!createCall!.includes('"agent"'), "session.create should not have agent parameter")
  })

  await runTest("Prompt should include agent parameter", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["my-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    await executor.execute("my-agent", { input: "test", context: {} })
    
    const promptCall = client.callLog.find(log => log.startsWith("prompt:"))
    assert(promptCall !== undefined, "session.prompt should be called")
    assert(promptCall!.includes("my-agent"), "prompt should include agent name")
  })

  await runTest("Prompt should send parts array", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    // If parts array is not sent correctly, mock will throw
    await executor.execute("test-agent", { input: "test", context: {} })
  })

  await runTest("Status should return session map", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    await executor.execute("test-agent", { input: "test", context: {} })
    
    const statusCall = client.callLog.find(log => log === "status")
    assert(statusCall !== undefined, "session.status should be called")
  })

  await runTest("Messages should use path.id parameter", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    await executor.execute("test-agent", { input: "test", context: {} })
    
    const messagesCall = client.callLog.find(log => log.startsWith("messages:session-"))
    assert(messagesCall !== undefined, "session.messages should be called with session ID")
  })

  await runTest("Session cleanup should be called", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    await executor.execute("test-agent", { input: "test", context: {} })
    
    const deleteCall = client.callLog.find(log => log.startsWith("delete:"))
    assert(deleteCall !== undefined, "session.delete should be called")
    assert(client.sessions.size === 0, "session should be cleaned up")
  })

  console.log("\n📋 Test Suite 2: Response Handling")
  console.log("-".repeat(70))

  await runTest("Should extract result from message parts", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    const result = await executor.execute("test-agent", { input: "test", context: {} })
    
    assert(result.result !== undefined, "should have result field")
  })

  await runTest("Should handle context in prompt", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    // Store session ID before execution completes
    let capturedSessionId: string | null = null
    const originalPrompt = client.session.prompt
    client.session.prompt = async (args: any) => {
      capturedSessionId = args.path.id
      return originalPrompt.call(client.session, args)
    }
    
    await executor.execute("test-agent", {
      input: "Build app",
      context: { plan: { files: ["app.ts"] } }
    })
    
    // Get the session that was used (before cleanup)
    assert(capturedSessionId !== null, "should have captured session ID")
    
    // Check the prompt that was sent
    const promptCall = client.callLog.find(log => log.startsWith("prompt:"))
    assert(promptCall !== undefined, "should have sent prompt")
  })

  console.log("\n📋 Test Suite 3: Error Handling")
  console.log("-".repeat(70))

  await runTest("Should handle agent not found", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    try {
      await executor.execute("nonexistent", { input: "test", context: {} })
      throw new Error("Should have thrown")
    } catch (error) {
      assert(
        error instanceof Error && error.message.includes("not found"),
        "should throw not found error"
      )
    }
  })

  await runTest("Should cleanup session on error", async () => {
    const client = new ValidatingMockClient()
    client.session.prompt = async () => {
      throw new Error("Prompt failed")
    }
    
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["test-agent"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    try {
      await executor.execute("test-agent", { input: "test", context: {} })
    } catch (error) {
      // Expected
    }
    
    assert(client.sessions.size === 0, "session should be cleaned up on error")
  })

  console.log("\n📋 Test Suite 4: End-to-End Flow")
  console.log("-".repeat(70))

  await runTest("Complete execution flow", async () => {
    const client = new ValidatingMockClient()
    const resolver = new AgentResolver(new Map(), client as any)
    resolver.registerOpenCodeAgents(["planner"])
    const executor = new OpenCodeAgentExecutor(client as any, resolver)
    
    const result = await executor.execute("planner", {
      input: "Create todo app",
      context: {}
    })
    
    // Verify call sequence
    assert(client.callLog.some(l => l.startsWith("create:")), "should create session")
    assert(client.callLog.some(l => l.startsWith("prompt:")), "should send prompt")
    assert(client.callLog.some(l => l === "status"), "should check status")
    assert(client.callLog.some(l => l.startsWith("messages:")), "should get messages")
    assert(client.callLog.some(l => l.startsWith("delete:")), "should delete session")
    
    assert(result.result !== undefined, "should return result")
    assert(client.sessions.size === 0, "should cleanup session")
  })

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Test Summary")
  console.log("=".repeat(70))
  console.log(`\nTotal: ${testsPassed + testsFailed}`)
  console.log(`Passed: ${testsPassed} ✅`)
  console.log(`Failed: ${testsFailed} ${testsFailed > 0 ? '❌' : ''}`)
  console.log("\n" + "=".repeat(70))

  if (testsFailed === 0) {
    console.log("🎉 All validation tests passed!")
    console.log("✅ SDK integration is working correctly")
    console.log("=".repeat(70) + "\n")
    process.exit(0)
  } else {
    console.log("❌ Some validation tests failed")
    console.log("=".repeat(70) + "\n")
    process.exit(1)
  }
}

main()

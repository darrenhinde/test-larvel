/**
 * Workflow Integration Tests
 * 
 * Comprehensive tests for the OpenCode workflow integration.
 * Run with: bun test-workflow-integration.ts
 */

import { WorkflowExecutor, MaxErrorGuard, CircularDependencyGuard } from "../src/workflow/executor"
import { AgentStepExecutor, TransformStepExecutor, ConditionStepExecutor } from "../src/workflow/executors/agent"
import { AgentResolver } from "../src/workflow/agent-resolver"
import { OpenCodeAgentExecutor } from "../src/workflow/opencode-agent-executor"
import type { WorkflowDefinition, AgentExecutor, UIManager } from "../src/workflow/types"
import type { 
  OpencodeClient,
  Session,
  SessionStatus,
  Message,
  Part,
  TextPart
} from "@opencode-ai/sdk"

// ============================================================================
// Mock Implementations for Testing
// ============================================================================

/**
 * Mock OpenCode client for testing
 */
class MockOpencodeClient {
  private sessions = new Map<string, any>()
  private sessionCounter = 0

  session = {
    create: async ({ body }: { body?: { title?: string } }) => {
      const sessionId = `session-${++this.sessionCounter}`
      this.sessions.set(sessionId, {
        id: sessionId,
        title: body?.title || "Test Session",
        agent: null,
        status: "busy" as const,
        messages: []
      })
      console.log(`  ✓ Created session ${sessionId}`)
      return { 
        data: { 
          id: sessionId, 
          title: body?.title || "Test Session",
          createdAt: new Date().toISOString()
        } as Session,
        error: undefined,
        request: {} as Request,
        response: {} as Response
      }
    },

    prompt: async ({ path, body }: { 
      path: { id: string }
      body?: { agent?: string; parts: any[] } 
    }) => {
      const session = this.sessions.get(path.id)
      if (!session) throw new Error(`Session ${path.id} not found`)
      
      // Store agent name
      if (body?.agent) {
        session.agent = body.agent
      }
      
      // Extract text from parts
      const promptText = body?.parts
        ?.filter(p => p.type === "text")
        .map(p => p.text)
        .join("\n") || ""
      
      session.messages.push({
        info: { id: "msg-user", role: "user" as const },
        parts: [{ type: "text" as const, text: promptText }]
      })
      
      // Simulate agent response
      const response = this.simulateAgentResponse(session.agent, promptText)
      session.messages.push({
        info: { id: "msg-assistant", role: "assistant" as const },
        parts: [{ type: "text" as const, text: JSON.stringify(response) }]
      })
      
      // Mark as idle after response
      session.status = "idle"
      
      console.log(`  ✓ Sent prompt to session ${path.id} with agent '${session.agent}'`)
      return { 
        data: {},
        error: undefined,
        request: {} as Request,
        response: {} as Response
      }
    },

    status: async () => {
      // Return status map for all sessions
      const statusMap: Record<string, SessionStatus> = {}
      for (const [id, session] of this.sessions) {
        statusMap[id] = { type: session.status }
      }
      return { 
        data: statusMap,
        error: undefined,
        request: {} as Request,
        response: {} as Response
      }
    },

    messages: async ({ path }: { path: { id: string } }) => {
      const session = this.sessions.get(path.id)
      if (!session) throw new Error(`Session ${path.id} not found`)
      
      return { 
        data: session.messages,
        error: undefined,
        request: {} as Request,
        response: {} as Response
      }
    },

    delete: async ({ path }: { path: { id: string } }) => {
      this.sessions.delete(path.id)
      console.log(`  ✓ Deleted session ${path.id}`)
      return { 
        data: true,
        error: undefined,
        request: {} as Request,
        response: {} as Response
      }
    }
  }

  private simulateAgentResponse(agent: string, prompt: string): any {
    // Simulate different agent responses
    switch (agent) {
      case "plan":
        return {
          plan: "Create authentication module",
          files: ["auth.ts", "user.ts"],
          steps: ["Create models", "Add routes", "Write tests"]
        }
      
      case "build":
        return {
          built: true,
          files: ["auth.ts", "user.ts"],
          linesOfCode: 150
        }
      
      case "test":
        return {
          passed: true,
          tests: 12,
          coverage: 95
        }
      
      case "review":
        return {
          approved: true,
          suggestions: ["Add error handling", "Improve types"]
        }
      
      case "researcher":
        return {
          findings: ["Module uses JWT", "Has 3 endpoints"],
          complexity: "medium"
        }
      
      case "reviewer":
        return {
          rating: 8,
          comments: ["Good structure", "Needs more tests"]
        }
      
      default:
        return {
          result: `Response from ${agent}`,
          prompt: prompt.substring(0, 50)
        }
    }
  }
}

/**
 * Mock UI Manager for testing
 */
const createMockUIManager = (): UIManager => ({
  showApprovalPrompt: async (message: string) => {
    console.log(`  ℹ Approval: ${message}`)
    return true
  },
  showWorkflowStart: async (workflowId: string) => {
    console.log(`\n🔄 Workflow Started: ${workflowId}`)
  },
  showWorkflowComplete: async (workflowId: string, duration: number) => {
    console.log(`✅ Workflow Completed: ${workflowId} (${duration}ms)`)
  },
  showWorkflowError: async (workflowId: string, error: Error) => {
    console.log(`❌ Workflow Failed: ${workflowId} - ${error.message}`)
  },
  showStepProgress: async (stepId: string, current: number, total: number) => {
    console.log(`  → Step ${current}/${total}: ${stepId}`)
  }
})

// ============================================================================
// Test Workflows
// ============================================================================

const simpleWorkflow: WorkflowDefinition = {
  id: "simple-test",
  description: "Simple single-step workflow",
  max_iterations: 3,
  max_duration_ms: 60000,
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "plan",
      timeout_ms: 30000
    }
  ]
}

const sequentialWorkflow: WorkflowDefinition = {
  id: "sequential-test",
  description: "Sequential multi-step workflow",
  max_iterations: 10,
  max_duration_ms: 120000,
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "plan",
      next: "build",
      timeout_ms: 30000
    },
    {
      id: "build",
      type: "agent",
      agent: "build",
      input: "plan",
      next: "test",
      timeout_ms: 30000
    },
    {
      id: "test",
      type: "agent",
      agent: "test",
      input: "build",
      timeout_ms: 30000
    }
  ]
}

const transformWorkflow: WorkflowDefinition = {
  id: "transform-test",
  description: "Workflow with transform step",
  max_iterations: 5,
  max_duration_ms: 60000,
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "plan",
      next: "transform",
      timeout_ms: 30000
    },
    {
      id: "transform",
      type: "transform",
      transform: "({ files: plan.files.length, steps: plan.steps.length })",
      timeout_ms: 5000
    }
  ]
}

const conditionWorkflow: WorkflowDefinition = {
  id: "condition-test",
  description: "Workflow with conditional routing",
  max_iterations: 5,
  max_duration_ms: 60000,
  steps: [
    {
      id: "test",
      type: "agent",
      agent: "test",
      next: "check",
      timeout_ms: 30000
    },
    {
      id: "check",
      type: "condition",
      condition: "test.passed === true",
      then: "success",
      else: "failure",
      timeout_ms: 5000
    },
    {
      id: "success",
      type: "agent",
      agent: "review",
      timeout_ms: 30000
    },
    {
      id: "failure",
      type: "agent",
      agent: "plan",
      timeout_ms: 30000
    }
  ]
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTest(
  name: string,
  workflow: WorkflowDefinition,
  input: any,
  executor: WorkflowExecutor
): Promise<boolean> {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`TEST: ${name}`)
  console.log(`${"=".repeat(60)}`)
  
  try {
    const result = await executor.execute(workflow, input)
    
    if (result.success) {
      console.log(`\n✅ TEST PASSED: ${name}`)
      console.log(`   Steps: ${result.context.metadata.iterationCount}`)
      console.log(`   Duration: ${Date.now() - result.context.startTime.getTime()}ms`)
      return true
    } else {
      console.log(`\n❌ TEST FAILED: ${name}`)
      console.log(`   Error: ${result.error?.message}`)
      return false
    }
  } catch (error) {
    console.log(`\n❌ TEST ERROR: ${name}`)
    console.log(`   ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("OpenAgents Workflow Integration Tests")
  console.log("=".repeat(60))
  
  // Setup
  const mockClient = new MockOpencodeClient()
  const mockUIManager = createMockUIManager()
  
  // Create mock agent map
  const agentMap = new Map([
    ["researcher", { name: "researcher", description: "Research agent", prompt: "Research" } as any],
    ["reviewer", { name: "reviewer", description: "Review agent", prompt: "Review" } as any]
  ])
  
  // Create resolver
  const resolver = new AgentResolver(agentMap, mockClient)
  resolver.registerOpenCodeAgents(["plan", "build", "test", "review"])
  
  // Create executors
  const agentExecutor = new OpenCodeAgentExecutor(mockClient as any, resolver)
  const workflowExecutor = new WorkflowExecutor({
    uiManager: mockUIManager,
    guards: [
      new MaxErrorGuard(10),
      new CircularDependencyGuard()
    ]
  })
  
  // Register step executors
  workflowExecutor.registerExecutor("agent", new AgentStepExecutor(agentExecutor))
  workflowExecutor.registerExecutor("transform", new TransformStepExecutor())
  workflowExecutor.registerExecutor("condition", new ConditionStepExecutor())
  
  // Run tests
  const results: boolean[] = []
  
  results.push(await runTest(
    "Simple Workflow (Single Step)",
    simpleWorkflow,
    { task: "Create authentication" },
    workflowExecutor
  ))
  
  results.push(await runTest(
    "Sequential Workflow (Plan → Build → Test)",
    sequentialWorkflow,
    { task: "Build login feature" },
    workflowExecutor
  ))
  
  results.push(await runTest(
    "Transform Workflow (Agent → Transform)",
    transformWorkflow,
    { task: "Analyze structure" },
    workflowExecutor
  ))
  
  results.push(await runTest(
    "Condition Workflow (Conditional Routing)",
    conditionWorkflow,
    { task: "Run tests" },
    workflowExecutor
  ))
  
  // Summary
  console.log(`\n${"=".repeat(60)}`)
  console.log("TEST SUMMARY")
  console.log(`${"=".repeat(60)}`)
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log(`\nPassed: ${passed}/${total}`)
  console.log(`Failed: ${total - passed}/${total}`)
  
  if (passed === total) {
    console.log(`\n✅ ALL TESTS PASSED!\n`)
    process.exit(0)
  } else {
    console.log(`\n❌ SOME TESTS FAILED\n`)
    process.exit(1)
  }
}

// Run tests
main().catch(error => {
  console.error("\n❌ FATAL ERROR:", error)
  process.exit(1)
})

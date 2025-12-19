/**
 * Basic Workflow Example
 * 
 * Demonstrates a simple sequential workflow with OpenAgents.
 */

import {
  WorkflowExecutor,
  AgentStepExecutor,
  MaxErrorGuard,
  CircularDependencyGuard,
  type WorkflowDefinition,
  type AgentExecutor,
  type UIManager
} from "../src/workflow"

// Mock agent executor (replace with real OpenAgents integration)
const mockAgentExecutor: AgentExecutor = {
  execute: async (agentName: string, input: any) => {
    console.log(`\n🤖 Executing agent: ${agentName}`)
    console.log(`📥 Input:`, JSON.stringify(input, null, 2))

    // Simulate agent execution
    await new Promise(resolve => setTimeout(resolve, 100))

    // Return mock results based on agent
    switch (agentName) {
      case "planner":
        return {
          plan: "Create authentication system",
          files: ["auth.ts", "user.ts", "session.ts"],
          approach: "JWT-based authentication"
        }
      
      case "coder":
        return {
          filesCreated: input.plan?.files || [],
          linesOfCode: 250,
          status: "completed"
        }
      
      case "tester":
        return {
          testsRun: 15,
          testsPassed: 15,
          coverage: "95%",
          status: "all tests passed"
        }
      
      default:
        return { result: `${agentName} completed` }
    }
  }
}

// Mock UI manager
const mockUIManager: UIManager = {
  showApprovalPrompt: async (message: string) => {
    console.log(`\n❓ Approval needed: ${message}`)
    return true
  },
  
  showWorkflowStart: async (workflowId: string) => {
    console.log(`\n🚀 Starting workflow: ${workflowId}`)
    console.log("=" .repeat(60))
  },
  
  showWorkflowComplete: async (workflowId: string, duration: number) => {
    console.log("\n" + "=".repeat(60))
    console.log(`✅ Workflow ${workflowId} completed in ${duration}ms`)
  },
  
  showWorkflowError: async (workflowId: string, error: Error) => {
    console.log("\n" + "=".repeat(60))
    console.log(`❌ Workflow ${workflowId} failed:`, error.message)
  },
  
  showStepProgress: async (stepId: string, current: number, total: number) => {
    console.log(`\n📍 Step ${current}/${total}: ${stepId}`)
  }
}

// Create workflow executor
const executor = new WorkflowExecutor({
  agentExecutor: mockAgentExecutor,
  uiManager: mockUIManager,
  guards: [
    new MaxErrorGuard(10),
    new CircularDependencyGuard()
  ]
})

// Register agent executor
executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))

// Define workflow
const workflow: WorkflowDefinition = {
  id: "auth-feature-workflow",
  description: "Build authentication feature: Plan → Code → Test",
  max_iterations: 100,
  max_duration_ms: 300000, // 5 minutes
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code",
      timeout_ms: 60000
    },
    {
      id: "code",
      type: "agent",
      agent: "coder",
      input: "plan", // Reference plan output
      next: "test",
      on_error: "error-handler",
      max_retries: 2
    },
    {
      id: "test",
      type: "agent",
      agent: "tester",
      max_retries: 3,
      timeout_ms: 120000
    },
    {
      id: "error-handler",
      type: "agent",
      agent: "error-handler"
    }
  ]
}

// Execute workflow
async function main() {
  console.log("\n🎯 OpenAgents Workflow Example")
  console.log("Building authentication feature...\n")

  const result = await executor.execute(workflow, {
    task: "Build JWT-based authentication system",
    requirements: [
      "User registration",
      "User login",
      "Session management",
      "Token refresh"
    ]
  })

  // Display results
  if (result.success) {
    console.log("\n📊 Workflow Results:")
    console.log("=" .repeat(60))
    
    const planResult = result.context.getResult("plan")
    if (planResult?.success) {
      console.log("\n📋 Plan:")
      console.log(JSON.stringify(planResult.data, null, 2))
    }
    
    const codeResult = result.context.getResult("code")
    if (codeResult?.success) {
      console.log("\n💻 Code:")
      console.log(JSON.stringify(codeResult.data, null, 2))
    }
    
    const testResult = result.context.getResult("test")
    if (testResult?.success) {
      console.log("\n🧪 Tests:")
      console.log(JSON.stringify(testResult.data, null, 2))
    }
    
    console.log("\n✨ All steps completed successfully!")
  } else {
    console.log("\n❌ Workflow failed:")
    console.log(result.error?.message)
  }
}

// Run example
main().catch(console.error)

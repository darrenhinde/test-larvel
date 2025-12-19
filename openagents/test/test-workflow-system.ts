#!/usr/bin/env bun
/**
 * Quick Test Script for OpenAgents Workflow System
 * 
 * This script tests the core functionality without relying on the full test suite.
 * Run with: bun run test-workflow-system.ts
 */

import {
  WorkflowExecutor,
  AgentStepExecutor,
  TransformStepExecutor,
  ConditionStepExecutor,
  MaxErrorGuard,
  CircularDependencyGuard,
  type WorkflowDefinition,
  type AgentExecutor,
  type UIManager
} from "../src/workflow"
import { AgentResolver } from "../src/workflow/agent-resolver"
import type { AgentDefinition } from "./src/agents/types"
import type { OpencodeClient } from "@opencode-ai/sdk"

console.log("\n🧪 OpenAgents Workflow System - Quick Test\n")
console.log("=" .repeat(60))

// ============================================================================
// Test 1: Agent Resolution
// ============================================================================

console.log("\n📋 Test 1: Agent Resolution")
console.log("-".repeat(60))

const agentMap = new Map<string, AgentDefinition>([
  ["custom-planner", {
    name: "custom-planner",
    path: "/path/to/planner.md",
    prompt: "You are a custom planner",
    description: "Custom planning agent",
    model: "anthropic/claude-sonnet-4",
    tools: ["read", "write"]
  }],
  ["analyzer", {
    name: "analyzer",
    path: "/path/to/analyzer.md",
    prompt: "You are an analyzer",
    description: "Code analysis agent",
    tools: ["read", "grep", "glob"]
  }]
])

const mockClient = {} as OpencodeClient
const resolver = new AgentResolver(agentMap, mockClient)

// Register OpenCode built-in agents
resolver.registerOpenCodeAgents(["plan", "build", "test", "review"])

// Test resolution
const customAgent = resolver.resolve("custom-planner")
const builtInAgent = resolver.resolve("plan")
const allAgents = resolver.listAgentNames()

console.log("✅ Custom agent resolved:", customAgent?.name, `(${customAgent?.source})`)
console.log("✅ Built-in agent resolved:", builtInAgent?.name, `(${builtInAgent?.source})`)
console.log("✅ Total agents available:", allAgents.length)
console.log("   Agents:", allAgents.join(", "))

// Test priority (OpenAgents > OpenCode)
const agentMapWithOverride = new Map<string, AgentDefinition>([
  ["plan", {
    name: "plan",
    path: "/path/to/custom-plan.md",
    prompt: "Custom plan agent",
    description: "Overrides built-in plan"
  }]
])

const resolverWithOverride = new AgentResolver(agentMapWithOverride, mockClient)
resolverWithOverride.registerOpenCodeAgents(["plan"])

const overriddenAgent = resolverWithOverride.resolve("plan")
console.log("✅ Priority test:", overriddenAgent?.source === "openagents" ? "PASS" : "FAIL")
console.log("   OpenAgents overrides OpenCode:", overriddenAgent?.source)

// ============================================================================
// Test 2: Workflow Execution
// ============================================================================

console.log("\n📋 Test 2: Workflow Execution")
console.log("-".repeat(60))

// Mock agent executor
const executionLog: string[] = []
const mockAgentExecutor: AgentExecutor = {
  execute: async (agentName: string, input: any) => {
    executionLog.push(`Executed: ${agentName}`)
    
    // Simulate different agent behaviors
    switch (agentName) {
      case "planner":
        return {
          plan: "Create authentication system",
          files: ["auth.ts", "user.ts"],
          approach: "JWT-based"
        }
      
      case "coder":
        return {
          filesCreated: input.plan?.files || [],
          linesOfCode: 150,
          status: "completed"
        }
      
      case "tester":
        return {
          testsRun: 10,
          testsPassed: 10,
          coverage: "95%"
        }
      
      default:
        return { result: `${agentName} completed` }
    }
  }
}

// Mock UI manager
const mockUIManager: UIManager = {
  showApprovalPrompt: async () => true,
  showWorkflowStart: async () => {},
  showWorkflowComplete: async () => {},
  showWorkflowError: async () => {},
  showStepProgress: async () => {}
}

// Create executor
const executor = new WorkflowExecutor({
  uiManager: mockUIManager,
  guards: [
    new MaxErrorGuard(10),
    new CircularDependencyGuard()
  ]
})

// Register executors
executor.registerExecutor("agent", new AgentStepExecutor(mockAgentExecutor))
executor.registerExecutor("transform", new TransformStepExecutor())
executor.registerExecutor("condition", new ConditionStepExecutor())

// Define workflow
const workflow: WorkflowDefinition = {
  id: "test-workflow",
  description: "Plan → Code → Test",
  steps: [
    {
      id: "plan",
      type: "agent",
      agent: "planner",
      next: "code"
    },
    {
      id: "code",
      type: "agent",
      agent: "coder",
      input: "plan",
      next: "test"
    },
    {
      id: "test",
      type: "agent",
      agent: "tester"
    }
  ]
}

// Execute workflow
const result = await executor.execute(workflow, {
  task: "Build authentication system"
})

console.log("✅ Workflow execution:", result.success ? "SUCCESS" : "FAILED")
console.log("✅ Steps executed:", executionLog.length)
console.log("   Execution order:", executionLog.join(" → "))

// Verify results
const planResult = result.context.getResult("plan")
const codeResult = result.context.getResult("code")
const testResult = result.context.getResult("test")

console.log("✅ Plan result:", planResult?.success ? "SUCCESS" : "FAILED")
console.log("✅ Code result:", codeResult?.success ? "SUCCESS" : "FAILED")
console.log("✅ Test result:", testResult?.success ? "SUCCESS" : "FAILED")

// ============================================================================
// Test 3: Context Passing
// ============================================================================

console.log("\n📋 Test 3: Context Passing")
console.log("-".repeat(60))

const contextTestExecutor: AgentExecutor = {
  execute: async (agentName: string, input: any) => {
    if (agentName === "step1") {
      return { value: 42 }
    } else if (agentName === "step2") {
      // Should receive step1's result
      return { 
        receivedValue: input.step1?.value,
        doubled: (input.step1?.value || 0) * 2
      }
    }
    return {}
  }
}

const contextExecutor = new WorkflowExecutor({
  uiManager: mockUIManager,
  guards: []
})

contextExecutor.registerExecutor("agent", new AgentStepExecutor(contextTestExecutor))

const contextWorkflow: WorkflowDefinition = {
  id: "context-test",
  description: "Test context passing",
  steps: [
    { id: "step1", type: "agent", agent: "step1", next: "step2" },
    { id: "step2", type: "agent", agent: "step2", input: "step1" }
  ]
}

const contextResult = await contextExecutor.execute(contextWorkflow, {})

const step1Result = contextResult.context.getResult("step1")
const step2Result = contextResult.context.getResult("step2")

console.log("✅ Step 1 output:", step1Result?.data?.value)
console.log("✅ Step 2 received:", step2Result?.data?.receivedValue)
console.log("✅ Step 2 computed:", step2Result?.data?.doubled)
console.log("✅ Context passing:", 
  step2Result?.data?.receivedValue === 42 && step2Result?.data?.doubled === 84 
    ? "PASS" : "FAIL"
)

// ============================================================================
// Test 4: Error Handling
// ============================================================================

console.log("\n📋 Test 4: Error Handling")
console.log("-".repeat(60))

let attemptCount = 0
const errorTestExecutor: AgentExecutor = {
  execute: async (agentName: string, input: any) => {
    if (agentName === "flaky-agent") {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error("Simulated failure")
      }
      return { success: true, attempts: attemptCount }
    }
    return {}
  }
}

const errorExecutor = new WorkflowExecutor({
  uiManager: mockUIManager,
  guards: []
})

errorExecutor.registerExecutor("agent", new AgentStepExecutor(errorTestExecutor, {
  maxRetries: 3,
  retryDelayMs: 10
}))

const errorWorkflow: WorkflowDefinition = {
  id: "error-test",
  description: "Test error handling",
  steps: [
    { 
      id: "flaky", 
      type: "agent", 
      agent: "flaky-agent",
      max_retries: 3
    }
  ]
}

const errorResult = await errorExecutor.execute(errorWorkflow, {})
const flakyResult = errorResult.context.getResult("flaky")

console.log("✅ Retry mechanism:", errorResult.success ? "PASS" : "FAIL")
console.log("✅ Attempts made:", attemptCount)
console.log("✅ Final result:", flakyResult?.success ? "SUCCESS" : "FAILED")

// ============================================================================
// Test 5: Transform Steps
// ============================================================================

console.log("\n📋 Test 5: Transform Steps")
console.log("-".repeat(60))

const transformExecutor = new WorkflowExecutor({
  uiManager: mockUIManager,
  guards: []
})

const simpleAgentExecutor: AgentExecutor = {
  execute: async (agentName: string, input: any) => {
    return { numbers: [1, 2, 3, 4, 5] }
  }
}

transformExecutor.registerExecutor("agent", new AgentStepExecutor(simpleAgentExecutor))
transformExecutor.registerExecutor("transform", new TransformStepExecutor())

const transformWorkflow: WorkflowDefinition = {
  id: "transform-test",
  description: "Test transform steps",
  steps: [
    { id: "data", type: "agent", agent: "data-agent", next: "sum" },
    { 
      id: "sum", 
      type: "transform", 
      transform: "data.numbers.reduce((a, b) => a + b, 0)",
      next: "double"
    },
    {
      id: "double",
      type: "transform",
      transform: "sum * 2"
    }
  ]
}

const transformResult = await transformExecutor.execute(transformWorkflow, {})
const sumResult = transformResult.context.getResult("sum")
const doubleResult = transformResult.context.getResult("double")

console.log("✅ Sum result:", sumResult?.data)
console.log("✅ Double result:", doubleResult?.data)
console.log("✅ Transform steps:", 
  sumResult?.data === 15 && doubleResult?.data === 30 ? "PASS" : "FAIL"
)

// ============================================================================
// Test 6: Condition Steps
// ============================================================================

console.log("\n📋 Test 6: Condition Steps")
console.log("-".repeat(60))

const conditionExecutor = new WorkflowExecutor({
  uiManager: mockUIManager,
  guards: []
})

const conditionAgentExecutor: AgentExecutor = {
  execute: async (agentName: string, input: any) => {
    if (agentName === "check") {
      return { value: 100 }
    } else if (agentName === "high") {
      return { message: "Value is high" }
    } else if (agentName === "low") {
      return { message: "Value is low" }
    }
    return {}
  }
}

conditionExecutor.registerExecutor("agent", new AgentStepExecutor(conditionAgentExecutor))
conditionExecutor.registerExecutor("condition", new ConditionStepExecutor())

const conditionWorkflow: WorkflowDefinition = {
  id: "condition-test",
  description: "Test condition steps",
  steps: [
    { id: "check", type: "agent", agent: "check", next: "evaluate" },
    { 
      id: "evaluate", 
      type: "condition",
      condition: "check.value > 50",
      then: "high",
      else: "low"
    },
    { id: "high", type: "agent", agent: "high" },
    { id: "low", type: "agent", agent: "low" }
  ]
}

const conditionResult = await conditionExecutor.execute(conditionWorkflow, {})
const highResult = conditionResult.context.getResult("high")
const lowResult = conditionResult.context.getResult("low")

console.log("✅ Condition evaluation:", highResult?.success ? "PASS" : "FAIL")
console.log("✅ Took 'then' branch:", highResult?.success ? "YES" : "NO")
console.log("✅ Skipped 'else' branch:", !lowResult ? "YES" : "NO")

// ============================================================================
// Summary
// ============================================================================

console.log("\n" + "=".repeat(60))
console.log("📊 Test Summary")
console.log("=".repeat(60))

const tests = [
  { name: "Agent Resolution", pass: allAgents.length === 6 },
  { name: "Priority System", pass: overriddenAgent?.source === "openagents" },
  { name: "Workflow Execution", pass: result.success },
  { name: "Context Passing", pass: step2Result?.data?.doubled === 84 },
  { name: "Error Handling", pass: errorResult.success && attemptCount === 3 },
  { name: "Transform Steps", pass: doubleResult?.data === 30 },
  { name: "Condition Steps", pass: highResult?.success && !lowResult }
]

const passedTests = tests.filter(t => t.pass).length
const totalTests = tests.length

tests.forEach(test => {
  console.log(`${test.pass ? "✅" : "❌"} ${test.name}`)
})

console.log("\n" + "=".repeat(60))
console.log(`🎯 Result: ${passedTests}/${totalTests} tests passed`)
console.log("=".repeat(60))

if (passedTests === totalTests) {
  console.log("\n🎉 All tests passed! The workflow system is working correctly.\n")
  process.exit(0)
} else {
  console.log("\n⚠️  Some tests failed. Please review the output above.\n")
  process.exit(1)
}

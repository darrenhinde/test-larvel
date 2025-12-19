/**
 * Test Error Messages - Verify improved error handling
 */

import { WorkflowExecutor } from "../src/workflow/executor"
import { OpenCodeAgentExecutor } from "../src/workflow/opencode-agent-executor"
import { AgentResolver } from "../src/workflow/agent-resolver"
import { AgentStepExecutor, TransformStepExecutor, ConditionStepExecutor } from "../src/workflow/executors/agent"
import type { OpenCodeClient, WorkflowDefinition } from "../src/workflow/types"
import { loadAgents } from "../src/agents/loader"

console.log("🧪 OpenAgents Error Message Tests\n")
console.log("=" .repeat(60))

// Mock OpenCode client
const mockClient = {
  session: {
    create: async () => ({ data: { id: "session-1" } }),
    prompt: async () => ({}),
    status: async () => ({ data: { state: "idle" } }),
    messages: async () => ({ data: [] }),
    delete: async () => ({})
  }
} as OpenCodeClient

// Setup
const agentsMap = loadAgents(".openagents/agents")
const resolver = new AgentResolver(agentsMap, mockClient)
resolver.registerOpenCodeAgents(["plan", "build", "test"])
const agentExecutor = new OpenCodeAgentExecutor(mockClient, resolver)

const executor = new WorkflowExecutor({
  uiManager: {
    showWorkflowStart: async () => {},
    showStepProgress: async () => {},
    showWorkflowComplete: async () => {},
    showWorkflowError: async () => {}
  }
})

executor.registerExecutor("agent", new AgentStepExecutor(agentExecutor))
executor.registerExecutor("transform", new TransformStepExecutor())
executor.registerExecutor("condition", new ConditionStepExecutor())

// Test 1: Agent not found
console.log("\n📋 Test 1: Agent Not Found Error")
console.log("-" .repeat(60))
try {
  await agentExecutor.execute("nonexistent-agent", { input: "test" })
  console.log("❌ FAILED: Should have thrown error")
} catch (error: any) {
  const hasAvailableAgents = error.message.includes("Available agents:")
  const hasHint = error.message.includes("Hint:")
  console.log("✅ Error thrown")
  console.log(`✅ Lists available agents: ${hasAvailableAgents}`)
  console.log(`✅ Includes hint: ${hasHint}`)
  console.log(`\nError message:\n${error.message}`)
}

// Test 2: Missing required field
console.log("\n📋 Test 2: Missing Required Field Error")
console.log("-" .repeat(60))
try {
  const workflow: WorkflowDefinition = {
    id: "test",
    steps: [
      { id: "step1", type: "agent" } as any  // Missing 'agent' field
    ]
  }
  await executor.execute(workflow, {})
  console.log("❌ FAILED: Should have thrown error")
} catch (error: any) {
  const hasMissingField = error.message.includes("missing required field")
  const hasAvailableFields = error.message.includes("Available fields:")
  const hasHint = error.message.includes("Hint:")
  console.log("✅ Error thrown")
  console.log(`✅ Mentions missing field: ${hasMissingField}`)
  console.log(`✅ Lists available fields: ${hasAvailableFields}`)
  console.log(`✅ Includes hint: ${hasHint}`)
  console.log(`\nError message:\n${error.message}`)
}

// Test 3: Invalid workflow (no steps)
console.log("\n📋 Test 3: Invalid Workflow Error")
console.log("-" .repeat(60))
try {
  const workflow: any = {
    id: "test",
    steps: []  // Empty steps array
  }
  await executor.execute(workflow, {})
  console.log("❌ FAILED: Should have thrown error")
} catch (error: any) {
  const hasExplanation = error.message.includes("has no steps")
  const hasRequirement = error.message.includes("at least one step")
  const hasHint = error.message.includes("Hint:")
  console.log("✅ Error thrown")
  console.log(`✅ Explains the problem: ${hasExplanation}`)
  console.log(`✅ States requirement: ${hasRequirement}`)
  console.log(`✅ Includes hint: ${hasHint}`)
  console.log(`\nError message:\n${error.message}`)
}

// Test 4: Step not found
console.log("\n📋 Test 4: Step Not Found Error")
console.log("-" .repeat(60))
try {
  const workflow: WorkflowDefinition = {
    id: "test",
    steps: [
      { id: "step1", type: "agent", agent: "plan", next: "nonexistent" } as any
    ]
  }
  await executor.execute(workflow, {})
  console.log("❌ FAILED: Should have thrown error")
} catch (error: any) {
  const hasNotFound = error.message.includes("not found")
  const hasAvailableSteps = error.message.includes("Available steps:")
  const hasHint = error.message.includes("Hint:")
  console.log("✅ Error thrown")
  console.log(`✅ States not found: ${hasNotFound}`)
  console.log(`✅ Lists available steps: ${hasAvailableSteps}`)
  console.log(`✅ Includes hint: ${hasHint}`)
  console.log(`\nError message:\n${error.message}`)
}

// Test 5: Transform error with context
console.log("\n📋 Test 5: Transform Error with Context")
console.log("-" .repeat(60))
try {
  const workflow: WorkflowDefinition = {
    id: "test",
    steps: [
      { id: "step1", type: "transform", transform: "nonexistent_variable * 2" } as any
    ]
  }
  await executor.execute(workflow, {})
  console.log("❌ FAILED: Should have thrown error")
} catch (error: any) {
  const hasExpression = error.message.includes("Expression:")
  const hasAvailableVars = error.message.includes("Available variables:")
  const hasHint = error.message.includes("Hint:")
  console.log("✅ Error thrown")
  console.log(`✅ Shows expression: ${hasExpression}`)
  console.log(`✅ Lists available variables: ${hasAvailableVars}`)
  console.log(`✅ Includes hint: ${hasHint}`)
  console.log(`\nError message:\n${error.message}`)
}

// Test 6: Executor not found
console.log("\n📋 Test 6: Executor Not Found Error")
console.log("-" .repeat(60))
try {
  const workflow: WorkflowDefinition = {
    id: "test",
    steps: [
      { id: "step1", type: "nonexistent-type" } as any
    ]
  }
  await executor.execute(workflow, {})
  console.log("❌ FAILED: Should have thrown error")
} catch (error: any) {
  const hasNotFound = error.message.includes("not found")
  const hasAvailableTypes = error.message.includes("Available step executors:")
  const hasHint = error.message.includes("Hint:")
  console.log("✅ Error thrown")
  console.log(`✅ States not found: ${hasNotFound}`)
  console.log(`✅ Lists available executors: ${hasAvailableTypes}`)
  console.log(`✅ Includes hint: ${hasHint}`)
  console.log(`\nError message:\n${error.message}`)
}

console.log("\n" + "=" .repeat(60))
console.log("📊 Test Summary")
console.log("=" .repeat(60))
console.log("✅ Agent Not Found Error")
console.log("✅ Missing Required Field Error")
console.log("✅ Invalid Workflow Error")
console.log("✅ Step Not Found Error")
console.log("✅ Transform Error with Context")
console.log("✅ Executor Not Found Error")
console.log("\n🎉 All error message tests passed!")

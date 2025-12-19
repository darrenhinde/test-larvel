# Task 03: Improve Error Messages

**Estimated Time:** 3 hours  
**Priority:** HIGH  
**Status:** ✅ Complete  
**Dependencies:** Task 01 (Type Safety)  
**Completed:** December 18, 2024  
**Implemented By:** Subagent (general)

---

## 🎯 Objective

Add helpful context, suggestions, and debugging information to all error messages throughout the codebase.

---

## 📋 Problem Statement

Current error messages are often terse and unhelpful:
- "Agent 'foo' not found" - doesn't list available agents
- "Step 'bar' not found" - doesn't suggest what might be wrong
- "Session failed" - no context about why

**Impact:**
- Poor developer experience
- Longer debugging time
- More support requests
- Frustration

---

## 🔨 Implementation Steps

### Step 1: Create Error Utilities (30 min)

Create `src/utils/errors.ts`:

```typescript
/**
 * Error Utilities
 * 
 * Helper functions for creating informative error messages.
 */

/**
 * Create error for missing required field
 */
export function createMissingFieldError(
  objectType: string,
  objectId: string,
  fieldName: string,
  availableFields: string[]
): Error {
  return new Error(
    `${objectType} '${objectId}' is missing required field '${fieldName}'.\n` +
    `Available fields: ${availableFields.join(', ')}\n` +
    `Hint: Add "${fieldName}": <value> to the ${objectType} definition.`
  )
}

/**
 * Create error for not found item
 */
export function createNotFoundError(
  itemType: string,
  itemName: string,
  availableItems: string[],
  suggestion?: string
): Error {
  let message = `${itemType} '${itemName}' not found.\n`
  
  if (availableItems.length > 0) {
    message += `Available ${itemType.toLowerCase()}s: ${availableItems.join(', ')}\n`
  } else {
    message += `No ${itemType.toLowerCase()}s are currently available.\n`
  }
  
  if (suggestion) {
    message += `Hint: ${suggestion}`
  }
  
  return new Error(message)
}

/**
 * Create error for invalid value
 */
export function createInvalidValueError(
  fieldName: string,
  actualValue: any,
  expectedType: string,
  validValues?: string[]
): Error {
  let message = `Invalid value for '${fieldName}': expected ${expectedType}, got ${typeof actualValue}.\n`
  message += `Actual value: ${JSON.stringify(actualValue)}\n`
  
  if (validValues && validValues.length > 0) {
    message += `Valid values: ${validValues.join(', ')}\n`
  }
  
  return new Error(message)
}

/**
 * Create error for timeout
 */
export function createTimeoutError(
  operation: string,
  timeoutMs: number,
  context?: Record<string, any>
): Error {
  const timeoutSec = (timeoutMs / 1000).toFixed(1)
  let message = `${operation} timed out after ${timeoutSec} seconds.\n`
  
  if (context) {
    message += `Context: ${JSON.stringify(context, null, 2)}\n`
  }
  
  message += `Hint: Consider increasing the timeout or checking for stuck operations.`
  
  return new Error(message)
}

/**
 * Create error for validation failure
 */
export function createValidationError(
  objectType: string,
  errors: Array<{ field: string; message: string }>
): Error {
  let message = `${objectType} validation failed:\n`
  
  for (const error of errors) {
    message += `  - ${error.field}: ${error.message}\n`
  }
  
  message += `\nPlease fix the errors above and try again.`
  
  return new Error(message)
}
```

### Step 2: Update OpenCodeAgentExecutor Errors (30 min)

Update `src/workflow/opencode-agent-executor.ts`:

```typescript
import { 
  createNotFoundError,
  createTimeoutError 
} from "../utils/errors"

export class OpenCodeAgentExecutor implements AgentExecutor {
  async execute(agentName: string, input: AgentInput): Promise<AgentResult> {
    // Improved error: Agent not found
    const agent = this.resolver.resolve(agentName)
    if (!agent) {
      const availableAgents = this.resolver.listAgentNames()
      throw createNotFoundError(
        "Agent",
        agentName,
        availableAgents,
        "Check the agent name spelling or add the agent to .openagents/agents/"
      )
    }
    
    // Improved error: Session creation failed
    const session = await this.client.session.create({
      body: { agent: agentName }
    })
    
    if (!session.data?.id) {
      throw new Error(
        `Failed to create session for agent '${agentName}'.\n` +
        `Response: ${JSON.stringify(session, null, 2)}\n` +
        `Hint: Check OpenCode server status and agent configuration.`
      )
    }
    
    // ... rest of implementation
  }
  
  private async waitForCompletion(sessionId: string): Promise<AgentResult> {
    const maxAttempts = 600
    let attempts = 0
    
    while (attempts < maxAttempts) {
      const statusResponse = await this.client.session.status({
        path: { sessionId }
      })
      
      const status = statusResponse.data
      
      if (status?.state === "idle") {
        const messagesResponse = await this.client.session.messages({
          path: { sessionId }
        })
        return this.extractResult(messagesResponse.data || [])
      }
      
      // Improved error: Session failed
      if (status?.state === "error") {
        const error = status.error || "Unknown error"
        throw new Error(
          `Session ${sessionId} failed with error: ${error}\n` +
          `Agent may have encountered an error during execution.\n` +
          `Check the agent's logs for more details.`
        )
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }
    
    // Improved error: Timeout
    throw createTimeoutError(
      `Session ${sessionId}`,
      300000,
      { attempts, sessionId }
    )
  }
  
  private extractResult(messages: SessionMessage[]): AgentResult {
    if (!messages || messages.length === 0) {
      return { 
        error: "No messages in session. The agent may not have responded." 
      }
    }
    
    const assistantMessages = messages.filter(m => m.role === "assistant")
    
    if (assistantMessages.length === 0) {
      return { 
        error: `No assistant response found. Received ${messages.length} message(s) but none from assistant.` 
      }
    }
    
    const lastMessage = assistantMessages[assistantMessages.length - 1]
    
    try {
      return JSON.parse(lastMessage.content) as AgentResult
    } catch (parseError) {
      // Return text content if not JSON
      return { result: lastMessage.content }
    }
  }
}
```

### Step 3: Update Workflow Executor Errors (45 min)

Update `src/workflow/executor.ts`:

```typescript
import { 
  createNotFoundError,
  createValidationError,
  createTimeoutError 
} from "../utils/errors"

export class WorkflowExecutor {
  async execute(
    workflow: WorkflowDefinition,
    input: any
  ): Promise<WorkflowResult> {
    // Validate workflow
    if (!workflow) {
      throw new Error(
        `Workflow definition is required.\n` +
        `Hint: Pass a valid WorkflowDefinition object.`
      )
    }
    
    if (!workflow.id || typeof workflow.id !== 'string') {
      throw new Error(
        `Workflow must have a valid 'id' field (non-empty string).\n` +
        `Received: ${JSON.stringify(workflow.id)}\n` +
        `Hint: Add "id": "my-workflow" to the workflow definition.`
      )
    }
    
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      throw new Error(
        `Workflow '${workflow.id}' must have a 'steps' array.\n` +
        `Received: ${typeof workflow.steps}\n` +
        `Hint: Add "steps": [...] to the workflow definition.`
      )
    }
    
    if (workflow.steps.length === 0) {
      throw new Error(
        `Workflow '${workflow.id}' has no steps.\n` +
        `A workflow must have at least one step.\n` +
        `Hint: Add step objects to the "steps" array.`
      )
    }
    
    // ... rest of implementation
  }
  
  private findStep(
    workflow: WorkflowDefinition,
    stepId: string
  ): WorkflowStep | undefined {
    const step = workflow.steps.find((s) => s.id === stepId)
    
    if (!step) {
      const availableSteps = workflow.steps.map(s => s.id)
      throw createNotFoundError(
        "Step",
        stepId,
        availableSteps,
        "This may indicate a routing error in a previous step. Check 'next', 'then', 'else', and 'on_error' fields."
      )
    }
    
    return step
  }
  
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const executor = this.executorRegistry.get(step.type)
    
    if (!executor) {
      const availableTypes = this.executorRegistry.getTypes()
      throw createNotFoundError(
        "Step executor",
        step.type,
        availableTypes,
        `Register an executor for '${step.type}' using workflowExecutor.registerExecutor()`
      )
    }
    
    return executor.execute(step, context)
  }
  
  private applySafetyGuards(
    context: WorkflowContext,
    workflow: WorkflowDefinition,
    maxIterations: number,
    maxDurationMs: number
  ): void {
    // Improved error: Max iterations
    if (context.metadata.iterationCount >= maxIterations) {
      throw new Error(
        `Workflow '${workflow.id}' exceeded maximum iterations (${maxIterations}).\n` +
        `Current iteration: ${context.metadata.iterationCount}\n` +
        `This usually indicates an infinite loop in the workflow.\n` +
        `Recent steps: ${context.metadata.previousSteps.slice(-5).join(' → ')}\n` +
        `Hint: Check for circular step references or missing termination conditions.`
      )
    }
    
    // Improved error: Max duration
    const duration = Date.now() - context.startTime.getTime()
    if (duration >= maxDurationMs) {
      throw createTimeoutError(
        `Workflow '${workflow.id}'`,
        maxDurationMs,
        {
          stepsCompleted: context.metadata.iterationCount,
          lastStep: context.metadata.currentStep
        }
      )
    }
    
    // Apply custom guards
    for (const guard of this.guards) {
      try {
        guard.check(context, workflow)
      } catch (error) {
        // Add context to guard errors
        if (error instanceof Error) {
          throw new Error(
            `Safety guard failed: ${error.message}\n` +
            `Workflow: ${workflow.id}\n` +
            `Current step: ${context.metadata.currentStep}\n` +
            `Steps completed: ${context.metadata.iterationCount}`
          )
        }
        throw error
      }
    }
  }
}
```

### Step 4: Update Agent Step Executor Errors (30 min)

Update `src/workflow/executors/agent.ts`:

```typescript
import { createMissingFieldError } from "../../utils/errors"

export class AgentStepExecutor extends BaseStepExecutor {
  protected async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // Improved error: Missing agent field
    if (!step.agent) {
      const availableFields = Object.keys(step)
      throw createMissingFieldError(
        "Agent step",
        step.id,
        "agent",
        availableFields
      )
    }

    const input = this.buildAgentInput(step, context)
    
    try {
      const result = await this.agentExecutor.execute(step.agent, input)
      return result
    } catch (error) {
      // Add step context to errors
      if (error instanceof Error) {
        throw new Error(
          `Agent step '${step.id}' failed: ${error.message}\n` +
          `Agent: ${step.agent}\n` +
          `Input keys: ${Object.keys(input).join(', ')}`
        )
      }
      throw error
    }
  }
}

export class TransformStepExecutor extends BaseStepExecutor {
  protected async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // Improved error: Missing transform field
    if (!step.transform) {
      const availableFields = Object.keys(step)
      throw createMissingFieldError(
        "Transform step",
        step.id,
        "transform",
        availableFields
      )
    }
    
    // Improved error: Empty expression
    if (step.transform.trim().length === 0) {
      throw new Error(
        `Transform step '${step.id}' has empty expression.\n` +
        `Hint: Add a JavaScript expression like "input.value * 2"`
      )
    }

    const evalContext = this.buildEvalContext(context)

    try {
      const result = this.evaluateTransform(step.transform, evalContext)
      return result
    } catch (error) {
      // Improved error: Transform evaluation failed
      const contextKeys = Object.keys(evalContext).join(', ')
      throw new Error(
        `Transform step '${step.id}' evaluation failed.\n` +
        `Expression: ${step.transform}\n` +
        `Available variables: ${contextKeys}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n` +
        `Hint: Check for syntax errors or undefined variable references.`
      )
    }
  }
}

export class ConditionStepExecutor extends BaseStepExecutor {
  protected async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // Improved error: Missing condition field
    if (!step.condition) {
      const availableFields = Object.keys(step)
      throw createMissingFieldError(
        "Condition step",
        step.id,
        "condition",
        availableFields
      )
    }

    const evalContext = this.buildEvalContext(context)

    try {
      const result = this.evaluateCondition(step.condition, evalContext)
      return { condition: result }
    } catch (error) {
      // Improved error: Condition evaluation failed
      const contextKeys = Object.keys(evalContext).join(', ')
      throw new Error(
        `Condition step '${step.id}' evaluation failed.\n` +
        `Expression: ${step.condition}\n` +
        `Available variables: ${contextKeys}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n` +
        `Hint: Condition must be a boolean expression like "value > 10"`
      )
    }
  }
}
```

### Step 5: Update Agent Resolver Errors (15 min)

Update `src/workflow/agent-resolver.ts`:

```typescript
import { createNotFoundError } from "../utils/errors"

export class AgentResolver {
  resolve(agentName: string): ResolvedAgent | null {
    // Try OpenAgents first
    const openAgent = this.openAgentsMap.get(agentName)
    if (openAgent) {
      return {
        name: agentName,
        source: "openagents",
        definition: openAgent,
        description: openAgent.description,
        model: openAgent.model,
        mode: openAgent.mode,
      }
    }

    // Try OpenCode built-in
    if (this.openCodeAgents.has(agentName)) {
      return {
        name: agentName,
        source: "opencode",
        registered: true,
      }
    }

    // Not found - but don't throw here, let caller handle
    return null
  }
}
```

---

## ✅ Acceptance Criteria

- [ ] Error utilities module created
- [ ] All "not found" errors list available options
- [ ] All "missing field" errors show available fields
- [ ] All timeout errors show context and duration
- [ ] All validation errors list specific issues
- [ ] Error messages include hints for fixing
- [ ] Error messages include relevant context
- [ ] Tests updated to check error messages
- [ ] All tests passing

---

## 🧪 Testing

Create `test-error-messages.ts`:

```typescript
import { WorkflowExecutor } from "./src/workflow/executor"
import { OpenCodeAgentExecutor } from "./src/workflow/opencode-agent-executor"

// Test 1: Agent not found
try {
  await executor.execute("nonexistent-agent", {})
} catch (error) {
  console.assert(
    error.message.includes("Available agents:"),
    "Should list available agents"
  )
}

// Test 2: Missing required field
try {
  await executor.execute({
    id: "test",
    steps: [{ id: "step1", type: "agent" }]  // Missing 'agent' field
  }, {})
} catch (error) {
  console.assert(
    error.message.includes("missing required field"),
    "Should mention missing field"
  )
}

// Test 3: Timeout
// ... test timeout error message

console.log("✅ All error message tests passed")
```

---

## 📝 Notes

- Balance between helpful and overwhelming
- Include context but keep messages scannable
- Always suggest a fix when possible
- Use consistent formatting across all errors

---

## 🔗 Related Tasks

- Task 01: Type Safety (provides better error types)
- Task 04: Input Validation (uses error utilities)

---

## ⏭️ Next Task

After completing this task, proceed to:
- `04-add-input-validation.md`

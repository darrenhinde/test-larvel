# Error Message Improvements - Test Results

This document demonstrates the improved error messages implemented in Task 03.

---

## Test 1: Agent Not Found

**Scenario:** Try to execute a non-existent agent

**Error Message:**
```
Agent 'nonexistent-agent' not found.
Available agents: CHANGELOG, CODE-QUALITY-ROADMAP, CONFIGURATION, PROJECT-STRUCTURE, 
  README, TASK-01-COMPLETION-REPORT, TASK-02-COMPLETION-REPORT, VERIFICATION-REPORT, 
  WORKFLOW-IMPLEMENTATION-SUMMARY, WORKFLOW-INTEGRATION-TEST-RESULTS, WORKFLOW-STATUS, 
  WORKFLOW-SUMMARY, build, plan, test
Hint: Check the agent name spelling or add the agent to .openagents/agents/
```

**✅ Improvements:**
- Lists all available agents
- Provides hint about checking spelling or adding new agent
- Clear, actionable feedback

---

## Test 2: Invalid Workflow (No Steps)

**Scenario:** Try to execute a workflow with an empty steps array

**Error Message:**
```
Workflow 'test' has no steps.
A workflow must have at least one step.
Hint: Add step objects to the "steps" array.
```

**✅ Improvements:**
- Clearly states the problem (no steps)
- Explains the requirement (at least one step)
- Provides actionable hint (add step objects)

---

## Test 3: Missing Workflow ID

**Scenario:** Create a workflow without an ID field

**Error Message:**
```
Workflow must have a valid 'id' field (non-empty string).
Received: undefined
Hint: Add "id": "my-workflow" to the workflow definition.
```

**✅ Improvements:**
- Shows what was received (undefined)
- Explains the requirement (non-empty string)
- Provides example of correct format

---

## Test 4: Step Not Found

**Scenario:** Route to a step ID that doesn't exist

**Error Message:**
```
Step 'nonexistent' not found.
Available steps: step1
Hint: This may indicate a routing error in a previous step. Check 'next', 'then', 'else', and 'on_error' fields.
```

**✅ Improvements:**
- Lists available steps
- Explains possible cause (routing error)
- Suggests which fields to check

---

## Test 5: Step Executor Not Found

**Scenario:** Use a step type that doesn't have a registered executor

**Error Message:**
```
Step executor 'nonexistent-type' not found.
Available step executors: agent, transform, condition
Hint: Register an executor for 'nonexistent-type' using workflowExecutor.registerExecutor()
```

**✅ Improvements:**
- Lists available executors
- Shows how to register a new executor
- Clear path to resolution

---

## Test 6: Missing Required Field (Agent Step)

**Scenario:** Create an agent step without the 'agent' field

**Error Message:**
```
Agent step 'step1' is missing required field 'agent'.
Available fields: id, type
Hint: Add "agent": <value> to the Agent step definition.
```

**✅ Improvements:**
- Shows which field is missing
- Lists available fields on the step
- Provides example of how to add the field

---

## Test 7: Transform Evaluation Error

**Scenario:** Use an undefined variable in a transform expression

**Error Message:**
```
Transform step 'step1' evaluation failed.
Expression: nonexistent_variable * 2
Available variables: input
Error: nonexistent_variable is not defined
Hint: Check for syntax errors or undefined variable references.
```

**✅ Improvements:**
- Shows the expression that failed
- Lists available variables for context
- Shows the underlying JavaScript error
- Provides debugging hint

---

## Test 8: Condition Evaluation Error

**Scenario:** Use incorrect syntax in a condition expression

**Error Message:**
```
Condition step 'step1' evaluation failed.
Expression: input > 10
Available variables: input
Error: Cannot read property '>' of undefined
Hint: Condition must be a boolean expression like "value > 10"
```

**✅ Improvements:**
- Shows the condition that failed
- Lists available variables
- Shows the error detail
- Provides example of valid condition

---

## Test 9: Workflow Timeout

**Scenario:** Workflow exceeds maximum duration

**Error Message:**
```
Workflow 'data-pipeline' timed out after 300.0 seconds.
Context: {
  "stepsCompleted": 42,
  "lastStep": "process-data"
}
Hint: Consider increasing the timeout or checking for stuck operations.
```

**✅ Improvements:**
- Shows timeout duration in human-readable format
- Includes context (steps completed, last step)
- Suggests possible solutions

---

## Test 10: Infinite Loop Detection

**Scenario:** Workflow exceeds maximum iterations

**Error Message:**
```
Workflow 'infinite-loop' exceeded maximum iterations (100).
Current iteration: 100
This usually indicates an infinite loop in the workflow.
Recent steps: step1 → step2 → step1 → step2 → step1
Hint: Check for circular step references or missing termination conditions.
```

**✅ Improvements:**
- Shows current iteration count
- Explains likely cause (infinite loop)
- Shows recent steps to identify the loop
- Suggests what to check

---

## Test 11: Session Creation Failed

**Scenario:** Failed to create OpenCode session

**Error Message:**
```
Failed to create session for agent 'plan'.
Response: {
  "data": null,
  "error": "Service unavailable"
}
Hint: Check OpenCode server status and agent configuration.
```

**✅ Improvements:**
- Shows the response from the server
- Suggests checking server status and configuration
- Provides debugging context

---

## Test 12: Session Error State

**Scenario:** OpenCode session enters error state

**Error Message:**
```
Session session-123 failed with error: Agent execution timed out
Agent may have encountered an error during execution.
Check the agent's logs for more details.
```

**✅ Improvements:**
- Shows the session ID and error
- Explains what might have happened
- Directs user to check logs

---

## Summary

All error messages now follow these principles:

1. ✅ **Clear Problem Statement** - What went wrong
2. ✅ **Contextual Information** - Relevant details (IDs, values, etc.)
3. ✅ **Available Options** - Lists of valid choices
4. ✅ **Actionable Hints** - How to fix the problem
5. ✅ **Debugging Context** - Information to help diagnose issues

**Result:** Significantly improved developer experience and faster debugging.

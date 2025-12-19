/**
 * Schema Validation Tests
 */

import { describe, it, expect } from "bun:test"
import {
  WorkflowDefinitionSchema,
  WorkflowStepSchema,
  validateWorkflow,
  validateStep
} from "./schema"

describe("WorkflowStepSchema", () => {
  it("should validate agent step", () => {
    const step = {
      id: "test",
      type: "agent",
      agent: "test-agent",
      next: "next-step"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should reject agent step without agent field", () => {
    const step = {
      id: "test",
      type: "agent",
      next: "next-step"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(false)
  })
  
  it("should validate parallel step", () => {
    const step = {
      id: "parallel",
      type: "parallel",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" },
        { id: "step2", type: "agent", agent: "agent2" }
      ]
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should reject parallel step without steps", () => {
    const step = {
      id: "parallel",
      type: "parallel"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(false)
  })
  
  it("should validate condition step", () => {
    const step = {
      id: "check",
      type: "condition",
      condition: "context.test.success === true",
      then: "deploy",
      else: "notify"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should reject condition step without condition", () => {
    const step = {
      id: "check",
      type: "condition",
      then: "deploy"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(false)
  })
  
  it("should validate transform step", () => {
    const step = {
      id: "extract",
      type: "transform",
      transform: "context.plan.files"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should reject transform step without transform", () => {
    const step = {
      id: "extract",
      type: "transform"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(false)
  })
  
  it("should validate approval step", () => {
    const step = {
      id: "approve",
      type: "approval",
      message: "Approve deployment?",
      on_approve: "deploy",
      on_reject: "cancel"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should reject invalid step type", () => {
    const step = {
      id: "test",
      type: "invalid"
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(false)
  })
  
  it("should validate step with retry config", () => {
    const step = {
      id: "test",
      type: "agent",
      agent: "test-agent",
      max_retries: 3,
      retry_delay_ms: 1000
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
  
  it("should validate step with timeout", () => {
    const step = {
      id: "test",
      type: "agent",
      agent: "test-agent",
      timeout_ms: 30000
    }
    
    const result = WorkflowStepSchema.safeParse(step)
    expect(result.success).toBe(true)
  })
})

describe("WorkflowDefinitionSchema", () => {
  it("should validate minimal workflow", () => {
    const workflow = {
      id: "test-workflow",
      description: "Test workflow",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.data.max_iterations).toBe(100)
      expect(result.data.max_duration_ms).toBe(300000)
      expect(result.data.parallel).toBe(false)
    }
  })
  
  it("should validate workflow with custom limits", () => {
    const workflow = {
      id: "test-workflow",
      description: "Test workflow",
      max_iterations: 50,
      max_duration_ms: 600000,
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.data.max_iterations).toBe(50)
      expect(result.data.max_duration_ms).toBe(600000)
    }
  })
  
  it("should validate workflow with initial context", () => {
    const workflow = {
      id: "test-workflow",
      description: "Test workflow",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ],
      initial_context: {
        foo: "bar",
        count: 42
      }
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(true)
  })
  
  it("should validate workflow with debug options", () => {
    const workflow = {
      id: "test-workflow",
      description: "Test workflow",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ],
      debug: true,
      trace: true
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(true)
  })
  
  it("should reject workflow without steps", () => {
    const workflow = {
      id: "test",
      description: "Test",
      steps: []
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(false)
  })
  
  it("should reject workflow without id", () => {
    const workflow = {
      description: "Test",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(false)
  })
  
  it("should reject workflow without description", () => {
    const workflow = {
      id: "test",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(false)
  })
  
  it("should reject workflow with duplicate step IDs", () => {
    const workflow = {
      id: "test-workflow",
      description: "Test workflow",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" },
        { id: "step1", type: "agent", agent: "agent2" }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(false)
  })
  
  it("should validate complex workflow", () => {
    const workflow = {
      id: "feature-dev",
      description: "Feature development workflow",
      max_iterations: 50,
      max_duration_ms: 600000,
      steps: [
        {
          id: "plan",
          type: "agent",
          agent: "planner",
          next: "approve"
        },
        {
          id: "approve",
          type: "approval",
          message: "Approve plan?",
          on_approve: "code",
          on_reject: "plan"
        },
        {
          id: "code",
          type: "agent",
          agent: "coder",
          input: "plan",
          max_retries: 2,
          next: "test",
          on_error: "plan"
        },
        {
          id: "test",
          type: "parallel",
          steps: [
            { id: "unit", type: "agent", agent: "test-unit" },
            { id: "integration", type: "agent", agent: "test-integration" }
          ],
          next: "check"
        },
        {
          id: "check",
          type: "condition",
          condition: "context.test.success === true",
          then: "deploy",
          else: "code"
        },
        {
          id: "deploy",
          type: "agent",
          agent: "deployer"
        }
      ]
    }
    
    const result = WorkflowDefinitionSchema.safeParse(workflow)
    expect(result.success).toBe(true)
  })
})

describe("validateWorkflow", () => {
  it("should return success for valid workflow", () => {
    const workflow = {
      id: "test",
      description: "Test",
      steps: [
        { id: "step1", type: "agent", agent: "agent1" }
      ]
    }
    
    const result = validateWorkflow(workflow)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.error).toBeUndefined()
  })
  
  it("should return error for invalid workflow", () => {
    const workflow = {
      id: "test",
      steps: [] // Missing description and empty steps
    }
    
    const result = validateWorkflow(workflow)
    
    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeDefined()
  })
})

describe("validateStep", () => {
  it("should return success for valid step", () => {
    const step = {
      id: "test",
      type: "agent",
      agent: "test-agent"
    }
    
    const result = validateStep(step)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.error).toBeUndefined()
  })
  
  it("should return error for invalid step", () => {
    const step = {
      id: "test",
      type: "agent"
      // Missing agent field
    }
    
    const result = validateStep(step)
    
    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeDefined()
  })
})

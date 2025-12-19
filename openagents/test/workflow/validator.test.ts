/**
 * Workflow Validator Tests
 */

import { describe, it, expect } from "bun:test"
import { WorkflowValidator, createValidator } from "./validator"
import type { WorkflowDefinition } from "./types"

describe("WorkflowValidator", () => {
  const validator = new WorkflowValidator()
  
  describe("validate", () => {
    it("should validate correct workflow", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test workflow",
        steps: [
          { id: "step1", type: "agent", agent: "agent1", next: "step2" },
          { id: "step2", type: "agent", agent: "agent2" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it("should detect missing agent field", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent" } as any
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.type === "missing_field" && e.field === "agent")).toBe(true)
    })
    
    it("should detect invalid next reference", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1", next: "missing" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "invalid_reference")).toBe(true)
    })
    
    it("should detect invalid on_error reference", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1", on_error: "missing" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "invalid_reference")).toBe(true)
    })
    
    it("should detect circular reference", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1", next: "step1" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "circular_dependency")).toBe(true)
    })
    
    it("should validate parallel step", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "parallel",
            type: "parallel",
            steps: [
              { id: "p1", type: "agent", agent: "agent1" },
              { id: "p2", type: "agent", agent: "agent2" }
            ]
          }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
    })
    
    it("should detect missing steps in parallel", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "parallel",
            type: "parallel"
          } as any
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "missing_field")).toBe(true)
    })
    
    it("should detect invalid min_success", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "parallel",
            type: "parallel",
            min_success: 5,
            steps: [
              { id: "p1", type: "agent", agent: "agent1" },
              { id: "p2", type: "agent", agent: "agent2" }
            ]
          }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "invalid_value")).toBe(true)
    })
    
    it("should validate condition step", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1", next: "check" },
          {
            id: "check",
            type: "condition",
            condition: "context.step1.success === true",
            then: "step2",
            else: "step3"
          },
          { id: "step2", type: "agent", agent: "agent2" },
          { id: "step3", type: "agent", agent: "agent3" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
    })
    
    it("should detect missing condition field", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "check",
            type: "condition",
            then: "step2"
          } as any
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "missing_field")).toBe(true)
    })
    
    it("should detect invalid condition expression", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "check",
            type: "condition",
            condition: "invalid expression",
            then: "step2"
          },
          { id: "step2", type: "agent", agent: "agent2" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "invalid_value")).toBe(true)
    })
    
    it("should validate transform step", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1", next: "extract" },
          {
            id: "extract",
            type: "transform",
            transform: "context.step1.files"
          }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
    })
    
    it("should detect missing transform field", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "extract",
            type: "transform"
          } as any
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "missing_field")).toBe(true)
    })
    
    it("should detect prototype pollution in transform", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "extract",
            type: "transform",
            transform: "context.step1.__proto__"
          }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "invalid_value")).toBe(true)
    })
    
    it("should validate approval step", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "approve",
            type: "approval",
            message: "Approve?",
            on_approve: "step2",
            on_reject: "step3"
          },
          { id: "step2", type: "agent", agent: "agent2" },
          { id: "step3", type: "agent", agent: "agent3" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
    })
    
    it("should detect invalid approval references", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          {
            id: "approve",
            type: "approval",
            message: "Approve?",
            on_approve: "missing"
          }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === "invalid_reference")).toBe(true)
    })
    
    it("should warn about unreachable steps", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1" },
          { id: "step2", type: "agent", agent: "agent2" } // Unreachable
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.type === "unused_step")).toBe(true)
    })
    
    it("should warn about missing error handlers", () => {
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps: [
          { id: "step1", type: "agent", agent: "agent1" }
        ]
      }
      
      const result = validator.validate(workflow)
      
      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.type === "missing_error_handler")).toBe(true)
    })
    
    it("should warn about long workflows", () => {
      const steps = []
      for (let i = 0; i < 60; i++) {
        steps.push({
          id: `step${i}`,
          type: "agent" as const,
          agent: `agent${i}`,
          next: i < 59 ? `step${i + 1}` : undefined
        })
      }
      
      const workflow: WorkflowDefinition = {
        id: "test",
        description: "Test",
        steps
      }
      
      const result = validator.validate(workflow)
      
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.type === "long_workflow")).toBe(true)
    })
  })
})

describe("createValidator", () => {
  it("should create validator instance", () => {
    const validator = createValidator()
    
    expect(validator).toBeDefined()
    expect(typeof validator.validate).toBe("function")
  })
})

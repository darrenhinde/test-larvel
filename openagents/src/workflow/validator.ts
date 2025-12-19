/**
 * Workflow Validator
 * 
 * Validates workflow definitions for correctness and safety.
 */

import type { 
  WorkflowDefinition, 
  WorkflowStep, 
  WorkflowValidator as IWorkflowValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from "./types"

/**
 * Default workflow validator implementation
 */
export class WorkflowValidator implements IWorkflowValidator {
  /**
   * Validate workflow definition
   */
  validate(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Collect all step IDs (including nested)
    const stepIds = this.collectStepIds(workflow.steps)
    
    // Validate each step
    for (const step of workflow.steps) {
      this.validateStep(step, stepIds, errors, warnings)
    }
    
    // Check for unreachable steps
    const reachableSteps = this.findReachableSteps(workflow.steps)
    for (const stepId of stepIds) {
      if (!reachableSteps.has(stepId)) {
        warnings.push({
          type: "unused_step",
          stepId,
          message: `Step "${stepId}" is unreachable and will never execute`
        })
      }
    }
    
    // Check workflow length
    if (workflow.steps.length > 50) {
      warnings.push({
        type: "long_workflow",
        message: `Workflow has ${workflow.steps.length} steps. Consider breaking into smaller workflows.`
      })
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate a single step
   */
  private validateStep(
    step: WorkflowStep,
    allStepIds: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate step type-specific requirements
    switch (step.type) {
      case "agent":
        this.validateAgentStep(step, errors)
        break
      case "parallel":
        this.validateParallelStep(step, allStepIds, errors, warnings)
        break
      case "condition":
        this.validateConditionStep(step, allStepIds, errors)
        break
      case "transform":
        this.validateTransformStep(step, errors)
        break
      case "approval":
        this.validateApprovalStep(step, allStepIds, errors)
        break
    }
    
    // Validate routing references
    this.validateRouting(step, allStepIds, errors)
    
    // Check for missing error handlers
    if (!step.on_error && step.type === "agent") {
      warnings.push({
        type: "missing_error_handler",
        stepId: step.id,
        message: `Agent step "${step.id}" has no error handler (on_error)`
      })
    }
    
    // Check for circular references
    if (this.hasCircularReference(step, allStepIds)) {
      errors.push({
        type: "circular_dependency",
        stepId: step.id,
        message: `Step "${step.id}" has a circular reference in its routing`
      })
    }
  }
  
  /**
   * Validate agent step
   */
  private validateAgentStep(step: WorkflowStep, errors: ValidationError[]): void {
    if (!step.agent) {
      errors.push({
        type: "missing_field",
        stepId: step.id,
        field: "agent",
        message: `Agent step "${step.id}" must have "agent" field`
      })
    }
  }
  
  /**
   * Validate parallel step
   */
  private validateParallelStep(
    step: WorkflowStep,
    allStepIds: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!step.steps || step.steps.length === 0) {
      errors.push({
        type: "missing_field",
        stepId: step.id,
        field: "steps",
        message: `Parallel step "${step.id}" must have "steps" array with at least one step`
      })
      return
    }
    
    // Validate min_success
    if (step.min_success !== undefined) {
      if (step.min_success > step.steps.length) {
        errors.push({
          type: "invalid_value",
          stepId: step.id,
          field: "min_success",
          message: `Parallel step "${step.id}" min_success (${step.min_success}) cannot exceed number of steps (${step.steps.length})`
        })
      }
    }
    
    // Recursively validate nested steps
    for (const nestedStep of step.steps) {
      this.validateStep(nestedStep, allStepIds, errors, warnings)
    }
  }
  
  /**
   * Validate condition step
   */
  private validateConditionStep(
    step: WorkflowStep,
    allStepIds: Set<string>,
    errors: ValidationError[]
  ): void {
    if (!step.condition) {
      errors.push({
        type: "missing_field",
        stepId: step.id,
        field: "condition",
        message: `Condition step "${step.id}" must have "condition" field`
      })
    }
    
    if (!step.then) {
      errors.push({
        type: "missing_field",
        stepId: step.id,
        field: "then",
        message: `Condition step "${step.id}" must have "then" field`
      })
    }
    
    // Validate condition format
    if (step.condition) {
      const isValid = this.validateConditionExpression(step.condition)
      if (!isValid) {
        errors.push({
          type: "invalid_value",
          stepId: step.id,
          field: "condition",
          message: `Condition step "${step.id}" has invalid condition expression: "${step.condition}"`
        })
      }
    }
    
    // Validate then/else references
    if (step.then && !allStepIds.has(step.then)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "then",
        message: `Condition step "${step.id}" references non-existent step: "${step.then}"`
      })
    }
    
    if (step.else && !allStepIds.has(step.else)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "else",
        message: `Condition step "${step.id}" references non-existent step: "${step.else}"`
      })
    }
  }
  
  /**
   * Validate transform step
   */
  private validateTransformStep(step: WorkflowStep, errors: ValidationError[]): void {
    if (!step.transform) {
      errors.push({
        type: "missing_field",
        stepId: step.id,
        field: "transform",
        message: `Transform step "${step.id}" must have "transform" field`
      })
      return
    }
    
    // Validate transform format
    const isValid = this.validateTransformExpression(step.transform)
    if (!isValid) {
      errors.push({
        type: "invalid_value",
        stepId: step.id,
        field: "transform",
        message: `Transform step "${step.id}" has invalid transform expression: "${step.transform}"`
      })
    }
  }
  
  /**
   * Validate approval step
   */
  private validateApprovalStep(
    step: WorkflowStep,
    allStepIds: Set<string>,
    errors: ValidationError[]
  ): void {
    // Validate on_approve/on_reject references
    if (step.on_approve && !allStepIds.has(step.on_approve)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "on_approve",
        message: `Approval step "${step.id}" references non-existent step: "${step.on_approve}"`
      })
    }
    
    if (step.on_reject && !allStepIds.has(step.on_reject)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "on_reject",
        message: `Approval step "${step.id}" references non-existent step: "${step.on_reject}"`
      })
    }
  }
  
  /**
   * Validate routing references
   */
  private validateRouting(
    step: WorkflowStep,
    allStepIds: Set<string>,
    errors: ValidationError[]
  ): void {
    // Validate next reference
    if (step.next && !allStepIds.has(step.next)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "next",
        message: `Step "${step.id}" references non-existent next step: "${step.next}"`
      })
    }
    
    // Validate on_error reference
    if (step.on_error && !allStepIds.has(step.on_error)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "on_error",
        message: `Step "${step.id}" references non-existent error step: "${step.on_error}"`
      })
    }
    
    // Validate input reference
    if (step.input && !allStepIds.has(step.input)) {
      errors.push({
        type: "invalid_reference",
        stepId: step.id,
        field: "input",
        message: `Step "${step.id}" references non-existent input step: "${step.input}"`
      })
    }
  }
  
  /**
   * Check for circular references in routing
   */
  private hasCircularReference(step: WorkflowStep, allStepIds: Set<string>): boolean {
    const visited = new Set<string>()
    const stack = [step.id]
    
    while (stack.length > 0) {
      const currentId = stack.pop()!
      
      if (visited.has(currentId)) {
        return true // Circular reference detected
      }
      
      visited.add(currentId)
      
      // Check next step
      if (step.next && step.next === currentId) {
        return true
      }
      
      // Check error step
      if (step.on_error && step.on_error === currentId) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Collect all step IDs (including nested)
   */
  private collectStepIds(steps: WorkflowStep[]): Set<string> {
    const ids = new Set<string>()
    
    const collect = (stepList: WorkflowStep[]) => {
      for (const step of stepList) {
        ids.add(step.id)
        
        // Collect nested step IDs (parallel)
        if (step.steps) {
          collect(step.steps)
        }
      }
    }
    
    collect(steps)
    return ids
  }
  
  /**
   * Find all reachable steps from the first step
   */
  private findReachableSteps(steps: WorkflowStep[]): Set<string> {
    if (steps.length === 0) {
      return new Set()
    }
    
    const reachable = new Set<string>()
    const queue = [steps[0].id]
    const stepMap = this.buildStepMap(steps)
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      if (reachable.has(currentId)) {
        continue
      }
      
      reachable.add(currentId)
      
      const step = stepMap.get(currentId)
      if (!step) {
        continue
      }
      
      // Add next steps to queue
      if (step.next) queue.push(step.next)
      if (step.on_error) queue.push(step.on_error)
      if (step.on_approve) queue.push(step.on_approve)
      if (step.on_reject) queue.push(step.on_reject)
      if (step.then) queue.push(step.then)
      if (step.else) queue.push(step.else)
      
      // Add nested steps (parallel)
      if (step.steps) {
        for (const nestedStep of step.steps) {
          queue.push(nestedStep.id)
        }
      }
    }
    
    return reachable
  }
  
  /**
   * Build map of step ID to step
   */
  private buildStepMap(steps: WorkflowStep[]): Map<string, WorkflowStep> {
    const map = new Map<string, WorkflowStep>()
    
    const build = (stepList: WorkflowStep[]) => {
      for (const step of stepList) {
        map.set(step.id, step)
        
        // Build nested steps (parallel)
        if (step.steps) {
          build(step.steps)
        }
      }
    }
    
    build(steps)
    return map
  }
  
  /**
   * Validate condition expression format
   */
  private validateConditionExpression(condition: string): boolean {
    // Support: context.stepId.field === value
    // Support: context.stepId.field > value
    // Support: context.stepId.field < value
    const pattern = /^context\.\w+(\.\w+)*\s*(===|!==|>|<|>=|<=)\s*.+$/
    return pattern.test(condition)
  }
  
  /**
   * Validate transform expression format
   */
  private validateTransformExpression(transform: string): boolean {
    // Support: context.stepId.field.subfield
    // Prevent: __proto__, constructor, prototype
    
    if (transform.includes("__proto__") || 
        transform.includes("constructor") || 
        transform.includes("prototype")) {
      return false
    }
    
    const pattern = /^context\.\w+(\.\w+)*$/
    return pattern.test(transform)
  }
}

/**
 * Create default workflow validator
 */
export function createValidator(): IWorkflowValidator {
  return new WorkflowValidator()
}

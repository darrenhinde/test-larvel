/**
 * Workflow System - Zod Validation Schemas
 * 
 * Runtime validation schemas for workflow definitions.
 */

import { z } from "zod"

/**
 * Workflow step schema
 */
export const WorkflowStepSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string().min(1, "Step ID is required"),
  type: z.enum(["agent", "approval", "parallel", "condition", "transform"], {
    errorMap: () => ({ message: "Step type must be one of: agent, approval, parallel, condition, transform" })
  }),
  
  // Agent step fields
  agent: z.string().optional(),
  
  // Parallel step fields
  steps: z.array(WorkflowStepSchema).optional(),
  min_success: z.number().positive().optional(),
  
  // Condition step fields
  condition: z.string().optional(),
  then: z.string().optional(),
  else: z.string().optional(),
  
  // Transform step fields
  transform: z.string().optional(),
  
  // Approval step fields
  message: z.string().optional(),
  
  // Routing
  next: z.string().optional(),
  on_error: z.string().optional(),
  on_approve: z.string().optional(),
  on_reject: z.string().optional(),
  
  // Retry configuration
  max_retries: z.number().int().nonnegative().optional(),
  retry_delay_ms: z.number().int().nonnegative().optional(),
  
  // Timeout
  timeout_ms: z.number().int().positive().optional(),
  
  // Input reference
  input: z.string().optional()
}).refine(
  (step) => {
    // Validate agent step has agent field
    if (step.type === "agent" && !step.agent) {
      return false
    }
    return true
  },
  {
    message: "Agent step must have 'agent' field"
  }
).refine(
  (step) => {
    // Validate parallel step has steps field
    if (step.type === "parallel" && (!step.steps || step.steps.length === 0)) {
      return false
    }
    return true
  },
  {
    message: "Parallel step must have 'steps' array with at least one step"
  }
).refine(
  (step) => {
    // Validate condition step has required fields
    if (step.type === "condition" && (!step.condition || !step.then)) {
      return false
    }
    return true
  },
  {
    message: "Condition step must have 'condition' and 'then' fields"
  }
).refine(
  (step) => {
    // Validate transform step has transform field
    if (step.type === "transform" && !step.transform) {
      return false
    }
    return true
  },
  {
    message: "Transform step must have 'transform' field"
  }
))

/**
 * Workflow definition schema
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1, "Workflow ID is required"),
  description: z.string().min(1, "Workflow description is required"),
  
  // Safety limits
  max_iterations: z.number().int().positive().default(100),
  max_duration_ms: z.number().int().positive().default(300000), // 5 minutes
  
  // Execution mode
  parallel: z.boolean().default(false),
  
  // Steps
  steps: z.array(WorkflowStepSchema).min(1, "Workflow must have at least one step"),
  
  // Initial context
  initial_context: z.record(z.any()).optional(),
  
  // Context management
  max_context_size: z.number().int().positive().default(100),
  context_retention: z.enum(["all", "recent", "referenced"]).default("all"),
  
  // Debugging
  debug: z.boolean().default(false),
  trace: z.boolean().default(false),
  
  // Persistence
  persist: z.boolean().default(false),
  persist_dir: z.string().optional()
}).refine(
  (workflow) => {
    // Validate step IDs are unique
    const stepIds = new Set<string>()
    const collectStepIds = (steps: any[]): boolean => {
      for (const step of steps) {
        if (stepIds.has(step.id)) {
          return false // Duplicate ID
        }
        stepIds.add(step.id)
        
        // Check nested steps (parallel)
        if (step.steps) {
          if (!collectStepIds(step.steps)) {
            return false
          }
        }
      }
      return true
    }
    
    return collectStepIds(workflow.steps)
  },
  {
    message: "Step IDs must be unique across the workflow"
  }
)

/**
 * Step result schema
 */
export const StepResultSchema = z.object({
  stepId: z.string(),
  success: z.boolean(),
  data: z.any(),
  error: z.instanceof(Error).optional(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number().nonnegative(),
  retries: z.number().int().nonnegative().optional()
})

/**
 * Workflow result schema
 */
export const WorkflowResultSchema = z.object({
  success: z.boolean(),
  context: z.any(), // WorkflowContext (complex type)
  error: z.instanceof(Error).nullable(),
  trace: z.array(z.object({
    stepId: z.string(),
    timestamp: z.date(),
    result: StepResultSchema,
    context: z.record(z.any())
  })).optional()
})

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  type: z.enum(["missing_field", "invalid_reference", "circular_dependency", "invalid_type", "invalid_value"]),
  stepId: z.string().optional(),
  field: z.string().optional(),
  message: z.string()
})

/**
 * Validation warning schema
 */
export const ValidationWarningSchema = z.object({
  type: z.enum(["unused_step", "missing_error_handler", "long_workflow"]),
  stepId: z.string().optional(),
  message: z.string()
})

/**
 * Validation result schema
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema).optional()
})

/**
 * Type exports (inferred from schemas)
 */
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>
export type StepResult = z.infer<typeof StepResultSchema>
export type WorkflowResult = z.infer<typeof WorkflowResultSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>

/**
 * Validate workflow definition
 * 
 * @param workflow - Workflow definition to validate
 * @returns Validation result with parsed workflow or errors
 */
export function validateWorkflow(workflow: unknown): {
  success: boolean
  data?: WorkflowDefinition
  error?: z.ZodError
} {
  const result = WorkflowDefinitionSchema.safeParse(workflow)
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    }
  } else {
    return {
      success: false,
      error: result.error
    }
  }
}

/**
 * Validate workflow step
 * 
 * @param step - Workflow step to validate
 * @returns Validation result with parsed step or errors
 */
export function validateStep(step: unknown): {
  success: boolean
  data?: WorkflowStep
  error?: z.ZodError
} {
  const result = WorkflowStepSchema.safeParse(step)
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    }
  } else {
    return {
      success: false,
      error: result.error
    }
  }
}

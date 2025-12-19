/**
 * Condition Step Executor
 * 
 * Executes conditional routing steps by:
 * - Evaluating boolean expressions
 * - Routing to 'then' or 'else' branches
 * - Providing access to workflow context
 */

import type { WorkflowStep, WorkflowContext } from "../types"
import { BaseStepExecutor } from "./base"
import { createMissingFieldError } from "../../utils/errors"
import { validateString } from "../../utils/validation"

/**
 * Condition step executor - Evaluates conditions for routing
 */
export class ConditionStepExecutor extends BaseStepExecutor {
  /**
   * Execute condition step
   */
  protected async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // Validate step has condition
    if (!step.condition) {
      const availableFields = Object.keys(step)
      throw createMissingFieldError(
        "Condition step",
        step.id,
        "condition",
        availableFields
      )
    }
    
    // Validate condition field type
    validateString(step.condition, `step[${step.id}].condition`, { minLength: 1 })

    // Build context for evaluation
    const evalContext = this.buildEvalContext(context)

    // Evaluate condition
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

  /**
   * Route based on condition result
   */
  route(
    step: WorkflowStep,
    result: any,
    context: WorkflowContext
  ): string | null {
    // If step failed, use error handler
    if (!result.success && step.on_error) {
      return step.on_error
    }

    // Route based on condition result
    if (result.success && result.data?.condition) {
      return step.then ?? null
    } else if (result.success) {
      return step.else ?? null
    }

    return null
  }

  /**
   * Build evaluation context
   */
  protected buildEvalContext(context: WorkflowContext): Record<string, any> {
    const evalContext: Record<string, any> = {
      input: context.input,
    }

    // Add all step results
    context.results.forEach((result, stepId) => {
      if (result.success) {
        evalContext[stepId] = result.data
      }
    })

    return evalContext
  }

  /**
   * Evaluate condition expression
   */
  protected evaluateCondition(
    expression: string,
    context: Record<string, any>
  ): boolean {
    // Create function with context variables
    const contextKeys = Object.keys(context)
    const contextValues = Object.values(context)

    // Create function: (input, step1, step2, ...) => expression
    const fn = new Function(...contextKeys, `return ${expression}`)

    // Execute function and coerce to boolean
    return Boolean(fn(...contextValues))
  }
}

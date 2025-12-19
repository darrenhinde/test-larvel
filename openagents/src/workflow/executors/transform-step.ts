/**
 * Transform Step Executor
 * 
 * Executes data transformation steps by:
 * - Evaluating JavaScript expressions
 * - Providing access to workflow context
 * - Returning transformed data
 */

import type { WorkflowStep, WorkflowContext } from "../types"
import { BaseStepExecutor } from "./base"
import { createMissingFieldError } from "../../utils/errors"
import { validateString } from "../../utils/validation"

/**
 * Transform step executor - Executes data transformations
 */
export class TransformStepExecutor extends BaseStepExecutor {
  /**
   * Execute transform step
   */
  protected async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // Validate step has transform expression
    if (!step.transform) {
      const availableFields = Object.keys(step)
      throw createMissingFieldError(
        "Transform step",
        step.id,
        "transform",
        availableFields
      )
    }
    
    // Validate transform field type and not empty
    validateString(step.transform, `step[${step.id}].transform`, { minLength: 1 })

    // Build context for evaluation
    const evalContext = this.buildEvalContext(context)

    // Execute transform (safely)
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
   * Evaluate transform expression
   * 
   * Note: Uses Function constructor for evaluation
   * This is safe because workflow definitions are trusted
   */
  protected evaluateTransform(
    expression: string,
    context: Record<string, any>
  ): any {
    // Create function with context variables
    const contextKeys = Object.keys(context)
    const contextValues = Object.values(context)

    // Create function: (input, step1, step2, ...) => expression
    const fn = new Function(...contextKeys, `return ${expression}`)

    // Execute function
    return fn(...contextValues)
  }
}

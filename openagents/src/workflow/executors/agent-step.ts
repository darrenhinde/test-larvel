/**
 * Agent Step Executor
 * 
 * Executes agent workflow steps by:
 * - Building input from workflow context
 * - Executing the agent via AgentExecutor
 * - Handling errors with context
 */

import type {
  WorkflowStep,
  WorkflowContext,
  AgentExecutor,
} from "../types"
import { BaseStepExecutor, type RetryConfig } from "./base"
import { createMissingFieldError } from "../../utils/errors"
import { validateString } from "../../utils/validation"

/**
 * Agent step executor
 */
export class AgentStepExecutor extends BaseStepExecutor {
  constructor(
    private agentExecutor: AgentExecutor,
    retryConfig?: RetryConfig
  ) {
    super(retryConfig)
  }

  /**
   * Execute agent step
   */
  protected async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // Validate step has agent name
    if (!step.agent) {
      const availableFields = Object.keys(step)
      throw createMissingFieldError(
        "Agent step",
        step.id,
        "agent",
        availableFields
      )
    }
    
    // Validate agent field type
    validateString(step.agent, `step[${step.id}].agent`, { minLength: 1 })

    // Build agent input from context
    const input = this.buildAgentInput(step, context)

    // Execute agent
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

  /**
   * Build agent input from workflow context
   * 
   * Format:
   * {
   *   input: "Original workflow input",
   *   context: {
   *     step1: { ... },
   *     step2: { ... }
   *   },
   *   [referencedStep]: { ... }  // If step.input references a specific step
   * }
   */
  protected buildAgentInput(
    step: WorkflowStep,
    context: WorkflowContext
  ): any {
    const input: any = {
      input: context.input,
      context: this.serializeContext(context),
    }

    // If step references specific input, include it at top level
    if (step.input) {
      const referencedResult = context.getResult(step.input)
      if (referencedResult) {
        input[step.input] = referencedResult.data
      }
    }

    return input
  }

  /**
   * Serialize context results for agent input
   */
  protected serializeContext(context: WorkflowContext): Record<string, any> {
    const serialized: Record<string, any> = {}

    context.results.forEach((result, stepId) => {
      if (result.success) {
        serialized[stepId] = result.data
      }
    })

    return serialized
  }
}

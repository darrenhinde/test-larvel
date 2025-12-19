/**
 * Workflow Executor - Main orchestration engine
 * 
 * Executes workflows by:
 * - Managing execution loop
 * - Routing between steps
 * - Applying safety guards
 * - Tracking progress
 * - Handling errors
 */

import type {
  WorkflowDefinition,
  WorkflowContext,
  WorkflowResult,
  WorkflowStep,
  StepResult,
  StepExecutor,
  SafetyGuard,
  WorkflowLogger,
  UIManager,
  WorkflowExecutorConfig,
} from "./types"
import { createContext, pruneContext } from "./context/context"
import { ExecutorRegistry } from "./executors/base"
import { 
  createNotFoundError,
  createValidationError,
  createTimeoutError 
} from "../utils/errors"
import { 
  validateRequired, 
  validateString, 
  validateArray,
  validateObject 
} from "../utils/validation"

/**
 * Default safety limits
 */
const DEFAULT_MAX_ITERATIONS = 100
const DEFAULT_MAX_DURATION_MS = 300000 // 5 minutes
const DEFAULT_MAX_CONTEXT_SIZE = 100

/**
 * Workflow executor
 */
export class WorkflowExecutor {
  private executorRegistry: ExecutorRegistry
  private guards: SafetyGuard[]
  private logger?: WorkflowLogger
  private uiManager: UIManager

  constructor(config: WorkflowExecutorConfig) {
    this.executorRegistry = new ExecutorRegistry()
    this.guards = config.guards ?? []
    this.logger = config.logger
    this.uiManager = config.uiManager
  }

  /**
   * Register step executor for type
   */
  registerExecutor(type: string, executor: StepExecutor): void {
    this.executorRegistry.register(type, executor)
  }

  /**
   * Execute workflow
   */
  async execute(
    workflow: WorkflowDefinition,
    input: any
  ): Promise<WorkflowResult> {
    // Validate workflow structure
    validateRequired(workflow, 'workflow')
    validateObject(workflow, 'workflow')
    validateString(workflow.id, 'workflow.id', { minLength: 1 })
    validateArray(workflow.steps, 'workflow.steps', { minLength: 1 })
    
    // Validate each step has required fields
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      const stepPath = `workflow.steps[${i}]`
      
      validateObject(step, stepPath)
      validateString(step.id, `${stepPath}.id`, { minLength: 1 })
      validateString(step.type, `${stepPath}.type`, { minLength: 1 })
    }
    
    // Create initial context
    let context = createContext(workflow.id, input)

    // Notify UI
    await this.uiManager.showWorkflowStart(workflow.id)

    // Enable logging if requested
    if (workflow.debug && this.logger) {
      this.logger.enable()
    }

    try {
      // Execute workflow loop
      context = await this.executeWorkflowLoop(workflow, context)

      // Notify UI of completion
      const duration = Date.now() - context.startTime.getTime()
      await this.uiManager.showWorkflowComplete(workflow.id, duration)

      // Return success result
      return {
        success: true,
        context,
        error: null,
        trace: workflow.trace ? this.logger?.getTrace() : undefined,
      }
    } catch (error) {
      // Increment error count
      context = context.incrementError()

      // Notify UI of error
      const err = error instanceof Error ? error : new Error(String(error))
      await this.uiManager.showWorkflowError(workflow.id, err)

      // Return failure result
      return {
        success: false,
        context,
        error: err,
        trace: workflow.trace ? this.logger?.getTrace() : undefined,
      }
    } finally {
      // Dump trace if requested
      if (workflow.trace && this.logger) {
        this.logger.dumpTrace()
      }
    }
  }

  /**
   * Execute workflow loop
   */
  private async executeWorkflowLoop(
    workflow: WorkflowDefinition,
    initialContext: WorkflowContext
  ): Promise<WorkflowContext> {
    let context = initialContext
    let currentStepId: string | null = this.findFirstStep(workflow)
    const maxIterations = workflow.max_iterations ?? DEFAULT_MAX_ITERATIONS
    const maxDurationMs = workflow.max_duration_ms ?? DEFAULT_MAX_DURATION_MS
    const maxContextSize = workflow.max_context_size ?? DEFAULT_MAX_CONTEXT_SIZE

    // Main execution loop
    while (currentStepId !== null) {
      // Increment iteration count
      context = context.incrementIteration()

      // Apply safety guards
      this.applySafetyGuards(context, workflow, maxIterations, maxDurationMs)

      // Find step
      const step = this.findStep(workflow, currentStepId)

      // Update current step
      context = context.setCurrentStep(step.id)

      // Show progress
      await this.uiManager.showStepProgress(
        step.id,
        context.metadata.iterationCount,
        workflow.steps.length
      )

      // Execute step
      const result = await this.executeStep(step, context)

      // Log step execution
      if (this.logger) {
        this.logger.logStep(step.id, context, result)
      }

      // Add result to context
      context = context.addResult(step.id, result)

      // Increment error count if step failed
      if (!result.success) {
        context = context.incrementError()
      }

      // Prune context if needed
      if (context.results.size > maxContextSize) {
        context = pruneContext(context, maxContextSize)
      }

      // Route to next step
      currentStepId = await this.routeToNextStep(step, result, context)
    }

    return context
  }

  /**
   * Execute single step
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    // Get executor for step type
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

    // Execute step
    return executor.execute(step, context)
  }

  /**
   * Route to next step
   */
  private async routeToNextStep(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): Promise<string | null> {
    // Get executor for routing
    const executor = this.executorRegistry.get(step.type)
    if (!executor) {
      return null
    }

    // Let executor determine routing
    return executor.route(step, result, context)
  }

  /**
   * Find first step in workflow
   */
  private findFirstStep(workflow: WorkflowDefinition): string | null {
    if (workflow.steps.length === 0) {
      return null
    }

    // First step is the one not referenced by any other step
    const referencedSteps = new Set<string>()

    for (const step of workflow.steps) {
      if (step.next) referencedSteps.add(step.next)
      if (step.on_error) referencedSteps.add(step.on_error)
      if (step.on_approve) referencedSteps.add(step.on_approve)
      if (step.on_reject) referencedSteps.add(step.on_reject)
      if (step.then) referencedSteps.add(step.then)
      if (step.else) referencedSteps.add(step.else)
    }

    // Find first unreferenced step
    for (const step of workflow.steps) {
      if (!referencedSteps.has(step.id)) {
        return step.id
      }
    }

    // Fallback to first step
    return workflow.steps[0].id
  }

  /**
   * Find step by ID
   */
  private findStep(
    workflow: WorkflowDefinition,
    stepId: string
  ): WorkflowStep {
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

  /**
   * Apply safety guards
   */
  private applySafetyGuards(
    context: WorkflowContext,
    workflow: WorkflowDefinition,
    maxIterations: number,
    maxDurationMs: number
  ): void {
    // Check iteration limit
    if (context.metadata.iterationCount >= maxIterations) {
      throw new Error(
        `Workflow '${workflow.id}' exceeded maximum iterations (${maxIterations}).\n` +
        `Current iteration: ${context.metadata.iterationCount}\n` +
        `This usually indicates an infinite loop in the workflow.\n` +
        `Recent steps: ${context.metadata.previousSteps.slice(-5).join(' → ')}\n` +
        `Hint: Check for circular step references or missing termination conditions.`
      )
    }

    // Check duration limit
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

/**
 * Safety guard: Maximum error count
 */
export class MaxErrorGuard implements SafetyGuard {
  constructor(private maxErrors: number = 10) {}

  check(context: WorkflowContext, workflow: WorkflowDefinition): void {
    if (context.metadata.errorCount >= this.maxErrors) {
      throw new Error(
        `Workflow exceeded maximum errors (${this.maxErrors}). Aborting.`
      )
    }
  }
}

/**
 * Safety guard: Circular dependency detection
 */
export class CircularDependencyGuard implements SafetyGuard {
  check(context: WorkflowContext, workflow: WorkflowDefinition): void {
    const currentStep = context.metadata.currentStep
    const previousSteps = context.metadata.previousSteps

    // Check if current step was executed recently (within last 5 steps)
    const recentSteps = previousSteps.slice(-5)
    const occurrences = recentSteps.filter((s) => s === currentStep).length

    if (occurrences >= 3) {
      throw new Error(
        `Circular dependency detected: Step '${currentStep}' executed ${occurrences} times in last 5 steps`
      )
    }
  }
}

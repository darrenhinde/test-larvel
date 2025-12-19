/**
 * Base Executor - Foundation for all step executors
 * 
 * Provides common functionality for executing workflow steps:
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Result routing
 * - Error handling
 */

import type {
  WorkflowStep,
  WorkflowContext,
  StepResult,
  StepExecutor,
} from "../types"

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number
  /** Initial delay in milliseconds */
  initialDelayMs: number
  /** Backoff multiplier (exponential) */
  backoffMultiplier: number
  /** Maximum delay in milliseconds */
  maxDelayMs: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
}

/**
 * Abstract base executor with common functionality
 */
export abstract class BaseStepExecutor implements StepExecutor {
  constructor(protected retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute step with retry logic
   */
  async execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = new Date()
    const maxRetries = step.max_retries ?? this.retryConfig.maxRetries
    let lastError: Error | undefined
    let retries = 0

    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute with timeout
        const data = await this.executeWithTimeout(step, context)

        // Success - return result
        const endTime = new Date()
        return {
          stepId: step.id,
          success: true,
          data,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          retries,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        retries = attempt

        // If not last attempt, wait before retry
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt)
          await this.sleep(delay)
        }
      }
    }

    // All retries failed - return error result
    const endTime = new Date()
    return {
      stepId: step.id,
      success: false,
      data: null,
      error: lastError,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      retries,
    }
  }

  /**
   * Route to next step based on result
   */
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null {
    // If step failed and has error handler, route there
    if (!result.success && step.on_error) {
      return step.on_error
    }

    // If step succeeded, route to next step
    if (result.success && step.next) {
      return step.next
    }

    // No routing defined
    return null
  }

  /**
   * Execute step with timeout
   */
  protected async executeWithTimeout(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    const timeoutMs = step.timeout_ms ?? 60000 // Default 1 minute

    return Promise.race([
      this.executeStep(step, context),
      this.createTimeout(timeoutMs, step.id),
    ])
  }

  /**
   * Create timeout promise
   */
  protected createTimeout(ms: number, stepId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step '${stepId}' timed out after ${ms}ms`))
      }, ms)
    })
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  protected calculateRetryDelay(attempt: number): number {
    const delay =
      this.retryConfig.initialDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt)

    return Math.min(delay, this.retryConfig.maxDelayMs)
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Abstract method - implement in subclasses
   */
  protected abstract executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any>
}

/**
 * Executor registry - maps step types to executors
 */
export class ExecutorRegistry {
  private executors = new Map<string, StepExecutor>()

  /**
   * Register executor for step type
   */
  register(type: string, executor: StepExecutor): void {
    this.executors.set(type, executor)
  }

  /**
   * Get executor for step type
   */
  get(type: string): StepExecutor | undefined {
    return this.executors.get(type)
  }

  /**
   * Check if executor exists for type
   */
  has(type: string): boolean {
    return this.executors.has(type)
  }

  /**
   * Get all registered types
   */
  getTypes(): string[] {
    return Array.from(this.executors.keys())
  }
}

/**
 * Workflow Context Management
 * 
 * Immutable context creation and manipulation.
 * All methods return NEW context objects (functional programming).
 */

import type { WorkflowContext, StepResult } from "../types"

/**
 * Check if a value can be safely cloned using structuredClone
 * 
 * @param value - Value to check
 * @returns True if value is cloneable
 */
function isCloneable(value: any): boolean {
  try {
    structuredClone(value)
    return true
  } catch {
    return false
  }
}

/**
 * Create initial workflow context
 * 
 * @param workflowId - Unique workflow identifier
 * @param input - Original workflow input
 * @returns Immutable workflow context
 */
export function createContext(
  workflowId: string,
  input: any
): WorkflowContext {
  const startTime = new Date()
  
  return {
    workflowId,
    startTime,
    input,
    results: new Map(),
    metadata: {
      currentStep: "",
      previousSteps: [],
      iterationCount: 0,
      errorCount: 0
    },
    
    // Functional methods (return new context)
    addResult(stepId: string, result: StepResult): WorkflowContext {
      const newResults = new Map(this.results)
      
      // Validate that result data is cloneable
      if (!isCloneable(result.data)) {
        console.warn(
          `[WorkflowContext] Result data for step ${stepId} contains non-cloneable values. ` +
          `This may cause shared state issues.`
        )
      }
      
      // Deep clone the result to prevent shared references
      // This ensures immutability of nested objects and arrays
      const clonedResult: StepResult = {
        ...result,
        data: structuredClone(result.data),
        error: result.error ? structuredClone(result.error) : undefined
      }
      
      newResults.set(stepId, clonedResult)
      
      return {
        ...this,
        results: newResults,
        metadata: {
          ...this.metadata,
          currentStep: stepId,
          previousSteps: [...this.metadata.previousSteps, stepId]
        }
      }
    },
    
    getResult(stepId: string): StepResult | undefined {
      return this.results.get(stepId)
    },
    
    incrementIteration(): WorkflowContext {
      return {
        ...this,
        metadata: {
          ...this.metadata,
          iterationCount: this.metadata.iterationCount + 1
        }
      }
    },
    
    incrementError(): WorkflowContext {
      return {
        ...this,
        metadata: {
          ...this.metadata,
          errorCount: this.metadata.errorCount + 1
        }
      }
    },
    
    setCurrentStep(stepId: string): WorkflowContext {
      return {
        ...this,
        metadata: {
          ...this.metadata,
          currentStep: stepId
        }
      }
    }
  }
}

/**
 * Build context object for agent input
 * 
 * Converts context results into a plain object that can be passed to agents.
 * Only includes successful step results.
 * 
 * @param context - Workflow context
 * @returns Plain object with step results
 */
export function buildContextObject(context: WorkflowContext): Record<string, any> {
  const contextObj: Record<string, any> = {}
  
  for (const [stepId, result] of context.results) {
    if (result.success) {
      contextObj[stepId] = result.data
    }
  }
  
  return contextObj
}

/**
 * Get specific value from context by path
 * 
 * Supports dot notation: "stepId.field.subfield"
 * 
 * @param context - Workflow context
 * @param path - Dot-separated path (e.g., "plan.files")
 * @returns Value at path or undefined
 */
export function getContextValue(
  context: WorkflowContext,
  path: string
): any {
  // Parse path: stepId.field.subfield
  const parts = path.split(".")
  const stepId = parts[0]
  const fieldPath = parts.slice(1)
  
  const stepResult = context.getResult(stepId)
  if (!stepResult || !stepResult.success) {
    return undefined
  }
  
  // Navigate field path
  let value = stepResult.data
  for (const key of fieldPath) {
    if (value && typeof value === "object" && key in value) {
      value = value[key]
    } else {
      return undefined
    }
  }
  
  return value
}

/**
 * Prune context to prevent unbounded growth
 * 
 * Keeps only the most recent N results based on maxSize.
 * 
 * @param context - Workflow context
 * @param maxSize - Maximum number of results to keep
 * @returns New context with pruned results
 */
export function pruneContext(
  context: WorkflowContext,
  maxSize: number
): WorkflowContext {
  if (context.results.size <= maxSize) {
    return context
  }
  
  // Keep only recent results
  const recentSteps = context.metadata.previousSteps.slice(-maxSize)
  const newResults = new Map<string, StepResult>()
  
  for (const stepId of recentSteps) {
    const result = context.results.get(stepId)
    if (result) {
      newResults.set(stepId, result)
    }
  }
  
  return {
    ...context,
    results: newResults
  }
}

/**
 * Serialize context for logging/debugging
 * 
 * Converts context to a plain object that can be JSON.stringify'd.
 * 
 * @param context - Workflow context
 * @returns Serializable context object
 */
export function serializeContext(context: WorkflowContext): Record<string, any> {
  const results: Record<string, any> = {}
  
  for (const [stepId, result] of context.results) {
    results[stepId] = {
      success: result.success,
      data: result.data,
      error: result.error?.message,
      duration: result.duration,
      retries: result.retries
    }
  }
  
  return {
    workflowId: context.workflowId,
    startTime: context.startTime.toISOString(),
    input: context.input,
    results,
    metadata: {
      currentStep: context.metadata.currentStep,
      previousSteps: [...context.metadata.previousSteps],
      iterationCount: context.metadata.iterationCount,
      errorCount: context.metadata.errorCount
    }
  }
}

/**
 * Build agent input with context
 * 
 * Creates the input object that will be passed to an agent.
 * Includes original input, full context, and explicit references.
 * 
 * @param context - Workflow context
 * @param explicitReference - Optional step ID to reference explicitly
 * @returns Agent input object
 */
export function buildAgentInput(
  context: WorkflowContext,
  explicitReference?: string
): any {
  const input: any = {
    // Original workflow input
    input: context.input,
    
    // Full context object
    context: buildContextObject(context)
  }
  
  // Add explicit reference if specified
  if (explicitReference) {
    const referencedResult = context.getResult(explicitReference)
    if (referencedResult && referencedResult.success) {
      input[explicitReference] = referencedResult.data
    }
  }
  
  return input
}

/**
 * Check if context has result for step
 * 
 * @param context - Workflow context
 * @param stepId - Step identifier
 * @returns True if result exists
 */
export function hasResult(context: WorkflowContext, stepId: string): boolean {
  return context.results.has(stepId)
}

/**
 * Get all successful results
 * 
 * @param context - Workflow context
 * @returns Array of successful step results
 */
export function getSuccessfulResults(context: WorkflowContext): StepResult[] {
  const results: StepResult[] = []
  
  for (const result of context.results.values()) {
    if (result.success) {
      results.push(result)
    }
  }
  
  return results
}

/**
 * Get all failed results
 * 
 * @param context - Workflow context
 * @returns Array of failed step results
 */
export function getFailedResults(context: WorkflowContext): StepResult[] {
  const results: StepResult[] = []
  
  for (const result of context.results.values()) {
    if (!result.success) {
      results.push(result)
    }
  }
  
  return results
}

/**
 * Calculate total workflow duration
 * 
 * @param context - Workflow context
 * @returns Duration in milliseconds
 */
export function getWorkflowDuration(context: WorkflowContext): number {
  return Date.now() - context.startTime.getTime()
}

/**
 * Get workflow statistics
 * 
 * @param context - Workflow context
 * @returns Workflow statistics
 */
export function getWorkflowStats(context: WorkflowContext): {
  totalSteps: number
  successfulSteps: number
  failedSteps: number
  totalDuration: number
  averageStepDuration: number
  iterationCount: number
  errorCount: number
} {
  const successful = getSuccessfulResults(context)
  const failed = getFailedResults(context)
  const totalSteps = context.results.size
  
  const totalStepDuration = [...context.results.values()]
    .reduce((sum, result) => sum + result.duration, 0)
  
  return {
    totalSteps,
    successfulSteps: successful.length,
    failedSteps: failed.length,
    totalDuration: getWorkflowDuration(context),
    averageStepDuration: totalSteps > 0 ? totalStepDuration / totalSteps : 0,
    iterationCount: context.metadata.iterationCount,
    errorCount: context.metadata.errorCount
  }
}

/**
 * Workflow System - Type Definitions
 * 
 * Core TypeScript interfaces for the workflow orchestration system.
 */

/**
 * Workflow definition - declarative JSON structure
 */
export interface WorkflowDefinition {
  /** Unique workflow identifier */
  id: string
  
  /** Human-readable description */
  description: string
  
  /** Maximum iterations before stopping (prevents infinite loops) */
  max_iterations?: number // Default: 100
  
  /** Maximum duration in milliseconds before timeout */
  max_duration_ms?: number // Default: 300000 (5 min)
  
  /** Enable parallel execution where possible */
  parallel?: boolean // Default: false
  
  /** Workflow steps */
  steps: WorkflowStep[]
  
  /** Initial context data */
  initial_context?: Record<string, any>
  
  /** Context management */
  max_context_size?: number // Max results to keep (default: 100)
  context_retention?: "all" | "recent" | "referenced" // Default: "all"
  
  /** Debugging */
  debug?: boolean // Enable debug logging
  trace?: boolean // Enable execution trace
  
  /** Persistence */
  persist?: boolean // Save state after each step
  persist_dir?: string // Where to save state
}

/**
 * Workflow step - single unit of work
 */
export interface WorkflowStep {
  /** Unique step identifier */
  id: string
  
  /** Step type */
  type: "agent" | "approval" | "parallel" | "condition" | "transform"
  
  // Agent step fields
  /** Agent name to execute */
  agent?: string
  
  // Parallel step fields
  /** Nested steps for parallel execution */
  steps?: WorkflowStep[]
  /** Minimum successful steps required (default: all) */
  min_success?: number
  
  // Condition step fields
  /** JavaScript expression to evaluate */
  condition?: string
  /** Step ID if condition is true */
  then?: string
  /** Step ID if condition is false */
  else?: string
  
  // Transform step fields
  /** JavaScript expression to transform data */
  transform?: string
  
  // Approval step fields
  /** Message to show user */
  message?: string
  
  // Routing
  /** Next step ID on success */
  next?: string
  /** Error handler step ID */
  on_error?: string
  /** Step ID on approval */
  on_approve?: string
  /** Step ID on rejection */
  on_reject?: string
  
  // Retry configuration
  /** Maximum retry attempts */
  max_retries?: number // Default: 1
  /** Delay between retries in milliseconds */
  retry_delay_ms?: number // Default: 0
  
  // Timeout
  /** Step timeout in milliseconds */
  timeout_ms?: number // Default: 60000 (1 min)
  
  // Input reference
  /** Reference to previous step output */
  input?: string
}

/**
 * Workflow context - immutable execution state
 */
export interface WorkflowContext {
  /** Workflow identifier */
  readonly workflowId: string
  
  /** Workflow start time */
  readonly startTime: Date
  
  /** Original workflow input */
  readonly input: any
  
  /** Step results (immutable map) */
  readonly results: ReadonlyMap<string, StepResult>
  
  /** Execution metadata */
  readonly metadata: {
    /** Current step being executed */
    readonly currentStep: string
    /** All previously executed steps */
    readonly previousSteps: readonly string[]
    /** Total iterations (for loop detection) */
    readonly iterationCount: number
    /** Total errors encountered */
    readonly errorCount: number
  }
  
  // Methods return NEW context (functional)
  
  /** Add step result and return new context */
  addResult(stepId: string, result: StepResult): WorkflowContext
  
  /** Get step result by ID */
  getResult(stepId: string): StepResult | undefined
  
  /** Increment iteration count and return new context */
  incrementIteration(): WorkflowContext
  
  /** Increment error count and return new context */
  incrementError(): WorkflowContext
  
  /** Update current step and return new context */
  setCurrentStep(stepId: string): WorkflowContext
}

/**
 * Step execution result
 */
export interface StepResult {
  /** Step identifier */
  readonly stepId: string
  
  /** Success flag */
  readonly success: boolean
  
  /** Result data (any format) - marked readonly to prevent mutations */
  readonly data: Readonly<any> | null
  
  /** Error if failed */
  readonly error?: Error
  
  /** Execution start time */
  readonly startTime: Date
  
  /** Execution end time */
  readonly endTime: Date
  
  /** Duration in milliseconds */
  readonly duration: number
  
  /** Retry attempts made */
  readonly retries?: number
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Overall success flag */
  success: boolean
  
  /** Final context state */
  context: WorkflowContext
  
  /** Error if workflow failed */
  error: Error | null
  
  /** Execution trace (if enabled) */
  trace?: WorkflowTrace[]
}

/**
 * Workflow execution trace entry
 */
export interface WorkflowTrace {
  /** Step identifier */
  stepId: string
  
  /** Timestamp */
  timestamp: Date
  
  /** Step result */
  result: StepResult
  
  /** Context snapshot (serialized) */
  context: Record<string, any>
}

/**
 * Step executor interface - executes a single step
 */
export interface StepExecutor {
  /**
   * Execute step and return result
   */
  execute(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult>
  
  /**
   * Determine next step based on result
   */
  route(
    step: WorkflowStep,
    result: StepResult,
    context: WorkflowContext
  ): string | null
}

/**
 * Safety guard interface - prevents workflow issues
 */
export interface SafetyGuard {
  /**
   * Check if workflow can continue
   * @throws Error if guard condition violated
   */
  check(
    context: WorkflowContext,
    workflow: WorkflowDefinition
  ): void
}

/**
 * Workflow validator interface
 */
export interface WorkflowValidator {
  /**
   * Validate workflow definition
   */
  validate(workflow: WorkflowDefinition): ValidationResult
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation success flag */
  valid: boolean
  
  /** Validation errors */
  errors: ValidationError[]
  
  /** Validation warnings */
  warnings?: ValidationWarning[]
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: "missing_field" | "invalid_reference" | "circular_dependency" | "invalid_type" | "invalid_value"
  
  /** Step ID where error occurred */
  stepId?: string
  
  /** Field name */
  field?: string
  
  /** Error message */
  message: string
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning type */
  type: "unused_step" | "missing_error_handler" | "long_workflow"
  
  /** Step ID where warning occurred */
  stepId?: string
  
  /** Warning message */
  message: string
}

/**
 * Workflow logger interface
 */
export interface WorkflowLogger {
  /** Enable logging */
  enable(): void
  
  /** Disable logging */
  disable(): void
  
  /** Log step execution */
  logStep(stepId: string, context: WorkflowContext, result: StepResult): void
  
  /** Dump execution trace */
  dumpTrace(): void
  
  /** Get trace entries */
  getTrace(): WorkflowTrace[]
  
  /** Clear trace */
  clearTrace(): void
}

/**
 * Agent executor interface - executes agents
 */
export interface AgentExecutor {
  /**
   * Execute agent with input
   */
  execute(agentName: string, input: any): Promise<any>
}

/**
 * UI manager interface - handles user interactions
 */
export interface UIManager {
  /**
   * Show approval prompt and wait for response
   */
  showApprovalPrompt(
    message: string,
    context: WorkflowContext,
    timeout?: number
  ): Promise<boolean>
  
  /**
   * Show workflow start notification
   */
  showWorkflowStart(workflowId: string): Promise<void>
  
  /**
   * Show workflow complete notification
   */
  showWorkflowComplete(workflowId: string, duration: number): Promise<void>
  
  /**
   * Show workflow error notification
   */
  showWorkflowError(workflowId: string, error: Error): Promise<void>
  
  /**
   * Show step progress
   */
  showStepProgress(stepId: string, current: number, total: number): Promise<void>
}

/**
 * Workflow executor configuration
 */
export interface WorkflowExecutorConfig {
  /** UI manager */
  uiManager: UIManager
  
  /** Safety guards */
  guards?: SafetyGuard[]
  
  /** Logger */
  logger?: WorkflowLogger
  
  /** Validator */
  validator?: WorkflowValidator
}

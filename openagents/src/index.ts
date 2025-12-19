/**
 * OpenAgents Plugin
 * 
 * A plugin for OpenCode that enables loading custom AI agents from markdown
 * files and orchestrating them via workflows.
 * 
 * @packageDocumentation
 */

// ============================================================================
// Main Plugin Export
// ============================================================================

export { default } from "./plugin/index.js"
export { default as OpenAgentsPlugin } from "./plugin/index.js"

// ============================================================================
// Configuration Exports
// ============================================================================

export { 
  loadConfig, 
  OpenAgentsConfigSchema 
} from "./plugin/config"

export type { 
  OpenAgentsConfig, 
  AgentConfig 
} from "./plugin/config"

// ============================================================================
// Agent System Exports
// ============================================================================

export { 
  loadAgents, 
  loadAgentFromFile 
} from "./agents/loader"

export type { 
  AgentDefinition, 
  OpenCodeAgentConfig 
} from "./agents/types"

// ============================================================================
// Workflow System Exports
// ============================================================================

// Core workflow executor and guards
export { 
  WorkflowExecutor,
  MaxErrorGuard,
  CircularDependencyGuard 
} from "./workflow/executor"

// Step executors
export { 
  AgentStepExecutor,
  TransformStepExecutor,
  ConditionStepExecutor 
} from "./workflow/executors/agent"

// Agent resolution and execution
export { 
  AgentResolver 
} from "./workflow/agent-resolver"

export { 
  OpenCodeAgentExecutor 
} from "./workflow/opencode-agent-executor"

// Workflow types
export type { 
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  StepResult,
  AgentExecutor,
  UIManager,
  SafetyGuard
} from "./workflow/types"

// ============================================================================
// Feature Exports
// ============================================================================

export { 
  createTaskTracker 
} from "./features/task-tracker"

export { 
  createContextManager 
} from "./features/context"

export { 
  createUIManager 
} from "./features/ui"

export type { 
  UIManager as UIManagerType 
} from "./features/ui"

// ============================================================================
// SDK Type Re-exports
// ============================================================================

// Re-export commonly used SDK types for convenience
export type {
  OpencodeClient,
  Session,
  SessionStatus,
  Message,
  Part,
  TextPart
} from "@opencode-ai/sdk"

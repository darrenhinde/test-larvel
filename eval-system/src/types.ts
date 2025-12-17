/**
 * Eval system types - Phase 2
 * Pattern matching support for comprehensive testing
 */

import type { Event } from "@opencode-ai/sdk";

/**
 * ============================================
 * PATTERN DEFINITIONS
 * ============================================
 */

/**
 * Behavioral Pattern - Tests HOW the agent accomplishes a task
 */
export type BehavioralPattern = {
  type: "behavioral";
  
  // Exact tool sequence
  toolSequence?: string[];
  
  // Tool sequence with wildcards (*, +, ?)
  toolPattern?: string; // e.g., "read* edit+ write"
  
  // Tool must/must not be called
  mustCall?: string[];
  mustNotCall?: string[];
  
  // Tool call frequency
  maxCalls?: Record<string, number>; // e.g., { read: 3 }
  minCalls?: Record<string, number>;
  
  // Timing constraints
  maxToolDuration?: Record<string, number>; // ms
};

/**
 * Output Pattern - Tests WHAT the agent produces
 */
export type OutputPattern = {
  type: "output";
  
  // File expectations
  filesCreated?: Array<{
    path: string;
    contains?: string[]; // Must contain these strings
    matches?: RegExp; // Must match regex
    minLines?: number;
    maxLines?: number;
  }>;
  
  filesModified?: string[];
  filesDeleted?: string[];
  
  // Response expectations
  responseContains?: string[];
  responseMatches?: RegExp[];
  
  // Code quality checks
  noLinterErrors?: boolean;
  noTypeErrors?: boolean;
};

/**
 * Performance Pattern - Tests efficiency
 */
export type PerformancePattern = {
  type: "performance";
  
  maxDuration?: number; // Total session duration
  maxToolCalls?: number; // Total number of tool calls
  
  // Efficiency metrics
  noRedundantReads?: boolean; // Don't read same file twice
  noRedundantEdits?: boolean; // Don't edit same file twice
  
  // Benchmarks
  fasterThan?: number; // Must be faster than N ms
  fewerToolsThan?: number; // Must use fewer than N tools
};

/**
 * Error Pattern - Tests failure handling
 */
export type ErrorPattern = {
  type: "error";
  
  shouldFail?: boolean; // Task should fail
  shouldRecover?: boolean; // Should recover from errors
  
  expectedErrors?: Array<{
    tool: string;
    messageContains?: string;
  }>;
  
  noUnhandledErrors?: boolean;
  gracefulDegradation?: boolean; // Should provide partial solution
};

/**
 * Combined Test Expectations
 */
export type TestExpectations = {
  behavioral?: BehavioralPattern;
  output?: OutputPattern;
  performance?: PerformancePattern;
  error?: ErrorPattern;
  
  // Custom validator
  custom?: (context: EvalContext) => Promise<ValidationResult>;
};

/**
 * Validation Result
 */
export type ValidationResult = {
  passed: boolean;
  message?: string;
  details?: any;
};

/**
 * ============================================
 * CORE DATA TYPES
 * ============================================
 */

/**
 * Captured tool call with full details
 */
export type ToolCall = {
  tool: string;
  callID: string;
  args: any;
  output: any;
  metadata: any;
  duration: number;
  timestamp: number;
};

/**
 * Eval context - All captured data
 */
export type EvalContext = {
  sessionID: string;
  directory: string;
  
  // Captured events
  events: Event[];
  
  // Tool execution log
  tools: ToolCall[];
  
  // Messages
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    parts: any[];
  }>;
  
  // Files changed
  filesChanged: string[];
  
  // Errors encountered
  errors: Array<{
    tool?: string;
    message: string;
    timestamp: number;
  }>;
  
  // Performance metrics
  metrics: {
    totalDuration: number;
    toolCallCount: number;
  };
};

/**
 * ============================================
 * TEST DEFINITIONS
 * ============================================
 */

/**
 * Simple test definition (backward compatible)
 */
export type SimpleTest = {
  name: string;
  prompt: string;
  expectedTool?: string; // Optional now - use expectations instead
  agentFile?: string;
  agentName?: string;
  
  // Phase 2: Pattern matching
  expectations?: TestExpectations;
  timeout?: number;
  files?: string[]; // Files to attach to prompt
  tags?: string[]; // For filtering tests
};

/**
 * Test result with validation details
 */
export type TestResult = {
  test: SimpleTest;
  passed: boolean;
  message: string;
  duration: number;
  validations?: ValidationResult[]; // Phase 2: Detailed validation results
  context?: EvalContext; // Phase 2: Full context
};

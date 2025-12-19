/**
 * Constants
 * 
 * Centralized constants used throughout the application.
 * Prefer named constants over magic numbers for better maintainability.
 */

// ============================================================================
// Session Polling Constants
// ============================================================================

/**
 * Interval between status checks when polling for session completion
 */
export const POLL_INTERVAL_MS = 500

/**
 * Maximum duration to wait for session completion (5 minutes)
 */
export const MAX_POLL_DURATION_MS = 300_000

/**
 * Maximum number of polling attempts
 * Calculated as: MAX_POLL_DURATION_MS / POLL_INTERVAL_MS
 */
export const MAX_POLL_ATTEMPTS = Math.ceil(MAX_POLL_DURATION_MS / POLL_INTERVAL_MS)

// ============================================================================
// Workflow Constants
// ============================================================================

/**
 * Default maximum iterations for a workflow
 */
export const DEFAULT_MAX_ITERATIONS = 100

/**
 * Default maximum duration for a workflow (10 minutes)
 */
export const DEFAULT_MAX_DURATION_MS = 600_000

/**
 * Default timeout for a single step (5 minutes)
 */
export const DEFAULT_STEP_TIMEOUT_MS = 300_000

// ============================================================================
// Retry Constants
// ============================================================================

/**
 * Default maximum retry attempts for failed steps
 */
export const DEFAULT_MAX_RETRIES = 3

/**
 * Default delay between retries (1 second)
 */
export const DEFAULT_RETRY_DELAY_MS = 1000

/**
 * Backoff multiplier for exponential retry delays
 */
export const RETRY_BACKOFF_MULTIPLIER = 2

/**
 * Maximum retry attempts for session cleanup
 */
export const SESSION_CLEANUP_MAX_RETRIES = 3

/**
 * Initial delay between session cleanup retries (1 second)
 * Actual delay increases exponentially with each retry
 */
export const SESSION_CLEANUP_RETRY_DELAY_MS = 1000

// ============================================================================
// Agent Constants
// ============================================================================

/**
 * Default agent mode
 */
export const DEFAULT_AGENT_MODE = "subagent" as const

/**
 * Default agent directory name
 */
export const DEFAULT_AGENTS_DIR = "agents"

// ============================================================================
// UI Constants
// ============================================================================

/**
 * Default toast notification duration (5 seconds)
 */
export const DEFAULT_TOAST_DURATION_MS = 5000

/**
 * Toast duration for important notifications (8 seconds)
 */
export const LONG_TOAST_DURATION_MS = 8000

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Minimum length for non-empty strings
 */
export const MIN_STRING_LENGTH = 1

/**
 * Maximum length for reasonable strings (to prevent abuse)
 */
export const MAX_STRING_LENGTH = 10_000

/**
 * Maximum array length (to prevent abuse)
 */
export const MAX_ARRAY_LENGTH = 1000

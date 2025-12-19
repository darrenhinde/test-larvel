# OpenAgents Production Readiness Tasks

**Created:** December 19, 2025  
**Status:** 🔴 CRITICAL FIXES REQUIRED  
**Estimated Total Effort:** 8-9 hours  
**Target:** Production-ready within 1-2 days

---

## 📊 Executive Summary

The OpenAgents plugin is **functional but not production-ready**. A comprehensive review identified **4 CRITICAL** and **8 MEDIUM-SEVERITY** issues that must be addressed before deployment.

**Current State:**
- ✅ Bun compatibility: EXCELLENT
- ✅ Build system: WORKING (export fix successful)
- ✅ Core architecture: SOLID
- ❌ Error handling: GAPS in critical paths
- ❌ Security: 1 path injection vulnerability
- ⚠️ Resource management: Cleanup failures could accumulate

**Review Source:** Comprehensive subagent review completed December 19, 2025

---

## 🎯 Task Overview

| Priority | Tasks | Total Effort | Blocking? |
|----------|-------|--------------|-----------|
| 🔴 CRITICAL | 4 tasks | ~5 hours | YES |
| 🟡 HIGH | 3 tasks | ~2.75 hours | NO |
| 🟢 MEDIUM | 2 tasks | ~1 hour | NO |
| **TOTAL** | **9 tasks** | **~8-9 hours** | - |

---

## 🔴 CRITICAL PRIORITY (Must Fix Before Production)

### Task 1: Add Error Status Handling to Session Polling

**Priority:** 🔴 CRITICAL  
**Effort:** 1 hour  
**Risk if Not Fixed:** Sessions may hang indefinitely, API errors silently ignored  
**Blocking:** YES - Could cause production outages

#### Problem Description

The session polling loop in `OpenCodeAgentExecutor` doesn't handle error statuses or API failures properly. While it has timeout protection via `MAX_POLL_ATTEMPTS`, it doesn't handle:
- `status.type === "error"` - Session failed
- Network/API errors during polling
- Missing or malformed status responses

**Current Code:**
```typescript
// src/workflow/opencode-agent-executor.ts:186-201
if (status.type === "idle") {
  break  // Success
}

if (status.type === "retry") {
  const waitTime = status.next || POLL_INTERVAL_MS
  await new Promise(resolve => setTimeout(resolve, waitTime))
  attempts++
  continue
}

// Status is "busy" - keep waiting
await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
attempts++
```

**What's Missing:**
- No handling for `status.type === "error"`
- No try-catch around API calls
- No validation of status response structure
- No fallback for unexpected status types

#### Files to Modify

**Primary File:**
- `src/workflow/opencode-agent-executor.ts` (lines 162-214)

**Related Files:**
- `src/utils/constants.ts` - Add `MAX_POLL_DURATION_MS` constant
- `src/utils/errors.ts` - Ensure error creation functions exist

#### Implementation Steps

1. **Add duration-based timeout** (backup to attempt-based)
   ```typescript
   const startTime = Date.now()
   const MAX_POLL_DURATION_MS = 300000  // 5 minutes
   ```

2. **Wrap polling in try-catch**
   ```typescript
   try {
     const statusResponse = await this.client.session.status()
     // ... existing logic
   } catch (error) {
     console.error(`[OpenCodeAgentExecutor] Polling error:`, error)
     attempts++
     
     if (attempts >= 3) {
       return { error: `Failed to poll session: ${error.message}` }
     }
     
     await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
   }
   ```

3. **Add error status handling**
   ```typescript
   if (status.type === "error") {
     return {
       error: status.error?.message || "Session failed with unknown error"
     }
   }
   ```

4. **Validate status response**
   ```typescript
   if (!statusResponse.data) {
     throw new Error(`Failed to get session status`)
   }
   
   const status = statusResponse.data[sessionId]
   
   if (!status) {
     throw new Error(`Session ${sessionId} not found in status response`)
   }
   ```

5. **Add elapsed time check**
   ```typescript
   const elapsed = Date.now() - startTime
   if (elapsed > MAX_POLL_DURATION_MS) {
     throw createTimeoutError(
       `Session ${sessionId}`,
       MAX_POLL_DURATION_MS,
       { attempts, sessionId, reason: 'duration exceeded' }
     )
   }
   ```

#### Testing Checklist

- [ ] Test with session that returns error status
- [ ] Test with network failure during polling
- [ ] Test with malformed status response
- [ ] Test timeout after MAX_POLL_ATTEMPTS
- [ ] Test timeout after MAX_POLL_DURATION_MS
- [ ] Verify error messages are helpful

#### Success Criteria

- ✅ All error statuses are handled gracefully
- ✅ Network errors don't crash the polling loop
- ✅ Timeouts work correctly (both attempt-based and duration-based)
- ✅ Error messages provide actionable information

#### Code Reference

**Full implementation:**
```typescript
private async waitForCompletion(sessionId: string): Promise<AgentResult> {
  let attempts = 0
  const startTime = Date.now()
  
  while (attempts < MAX_POLL_ATTEMPTS) {
    // Check elapsed time as backup
    const elapsed = Date.now() - startTime
    if (elapsed > MAX_POLL_DURATION_MS) {
      throw createTimeoutError(
        `Session ${sessionId}`,
        MAX_POLL_DURATION_MS,
        { attempts, sessionId, reason: 'duration exceeded' }
      )
    }
    
    try {
      const statusResponse = await this.client.session.status()
      
      if (!statusResponse.data) {
        throw new Error(`Failed to get session status`)
      }
      
      const status = statusResponse.data[sessionId]
      
      if (!status) {
        throw new Error(`Session ${sessionId} not found in status response`)
      }
      
      // Handle error status
      if (status.type === "error") {
        return {
          error: status.error?.message || "Session failed with unknown error"
        }
      }
      
      if (status.type === "idle") {
        break
      }
      
      if (status.type === "retry") {
        const waitTime = status.next || POLL_INTERVAL_MS
        await new Promise(resolve => setTimeout(resolve, waitTime))
        attempts++
        continue
      }
      
      // Status is "busy" - keep waiting
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
      attempts++
      
    } catch (error) {
      console.error(`[OpenCodeAgentExecutor] Polling error:`, error)
      attempts++
      
      // If we've had multiple failures, bail out
      if (attempts >= 3 && error instanceof Error) {
        return {
          error: `Failed to poll session status: ${error.message}`
        }
      }
      
      // Otherwise, wait and retry
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
  
  throw createTimeoutError(
    `Session ${sessionId}`,
    MAX_POLL_DURATION_MS,
    { attempts, sessionId, maxAttempts: MAX_POLL_ATTEMPTS }
  )
}
```

---

### Task 2: Fix Context Immutability Issues

**Priority:** 🔴 CRITICAL  
**Effort:** 2 hours  
**Risk if Not Fixed:** Data corruption, shared state bugs, race conditions  
**Blocking:** YES - Could cause subtle data corruption bugs

#### Problem Description

The workflow context uses shallow copying, which means nested objects are shared by reference. This violates the immutability contract and could cause data corruption when multiple steps modify the same data.

**Current Code:**
```typescript
// src/workflow/context/context.ts:36-48
addResult(stepId: string, result: StepResult): WorkflowContext {
  const newResults = new Map(this.results)  // ← Shallow copy
  newResults.set(stepId, result)
  
  return {
    ...this,  // ← Spread operator (shallow copy)
    results: newResults,
    metadata: {
      ...this.metadata,  // ← Shallow copy
      previousSteps: [...this.metadata.previousSteps, stepId]
    }
  }
}
```

**The Bug:**
```typescript
const ctx1 = createContext("wf1", {})
const result1 = {
  stepId: "step1",
  success: true,
  data: { users: [{ name: "Alice" }] },  // ← Nested object
}

const ctx2 = ctx1.addResult("step1", result1)

// Both contexts share the same data object!
const data1 = ctx1.getResult("step1")?.data
const data2 = ctx2.getResult("step1")?.data

data1.users.push({ name: "Bob" })  // ← MUTATES BOTH!
console.log(data2.users)  // [{ name: "Alice" }, { name: "Bob" }] ← BUG!
```

#### Files to Modify

**Primary File:**
- `src/workflow/context/context.ts` (lines 36-48, 50-62)

**Related Files:**
- `src/workflow/types.ts` - Add readonly markers to interfaces
- `package.json` - May need to add dependency if using lodash

#### Implementation Options

**Option A: Use structuredClone() (Recommended)**

Pros:
- Native browser/Node.js API (Node 17+, Bun supports it)
- No dependencies
- Fast and reliable

Cons:
- Can't clone functions, symbols, or DOM nodes
- May fail on circular references

**Option B: Use lodash cloneDeep()**

Pros:
- Battle-tested
- Handles edge cases well

Cons:
- Adds dependency
- Larger bundle size

**Option C: Document immutability requirement**

Pros:
- No performance overhead
- Simple

Cons:
- Relies on developer discipline
- Easy to violate accidentally

#### Implementation Steps (Option A - Recommended)

1. **Add deep cloning to addResult()**
   ```typescript
   addResult(stepId: string, result: StepResult): WorkflowContext {
     const newResults = new Map(this.results)
     
     // Deep clone the result to prevent shared references
     const clonedResult: StepResult = {
       ...result,
       data: structuredClone(result.data),  // ← Deep clone
       error: result.error ? structuredClone(result.error) : undefined
     }
     
     newResults.set(stepId, clonedResult)
     
     return {
       ...this,
       results: newResults,
       metadata: {
         ...this.metadata,
         previousSteps: [...this.metadata.previousSteps, stepId]
       }
     }
   }
   ```

2. **Add deep cloning to updateMetadata()**
   ```typescript
   updateMetadata(updates: Partial<WorkflowMetadata>): WorkflowContext {
     return {
       ...this,
       metadata: {
         ...this.metadata,
         ...structuredClone(updates)  // ← Deep clone updates
       }
     }
   }
   ```

3. **Add readonly markers to types**
   ```typescript
   // src/workflow/types.ts
   export interface StepResult {
     readonly stepId: string
     readonly success: boolean
     readonly data: Readonly<any>  // ← Mark as readonly
     readonly error?: Readonly<string>
     readonly duration?: number
     readonly timestamp: number
   }
   ```

4. **Add validation helper**
   ```typescript
   // src/workflow/context/context.ts
   function isCloneable(value: any): boolean {
     try {
       structuredClone(value)
       return true
     } catch {
       return false
     }
   }
   
   // Use in addResult:
   if (!isCloneable(result.data)) {
     console.warn(
       `[WorkflowContext] Result data for step ${stepId} contains non-cloneable values. ` +
       `This may cause shared state issues.`
     )
   }
   ```

#### Testing Checklist

- [ ] Test that modifying result data doesn't affect previous contexts
- [ ] Test with nested objects (arrays, objects, Maps, Sets)
- [ ] Test with primitive values (should still work)
- [ ] Test with undefined/null values
- [ ] Test performance impact (benchmark if needed)
- [ ] Verify TypeScript readonly markers prevent mutations

#### Success Criteria

- ✅ Context objects are truly immutable
- ✅ Nested data is deep-cloned
- ✅ TypeScript prevents accidental mutations
- ✅ Performance impact is acceptable (<10ms per clone)
- ✅ All existing tests still pass

#### Alternative Implementation (Option C - Document Only)

If deep cloning is too expensive, document the requirement:

```typescript
/**
 * Add a step result to the context.
 * 
 * IMPORTANT: The result.data object should be treated as immutable.
 * Do not modify result.data after passing it to addResult().
 * If you need to modify data, create a new object:
 * 
 * @example
 * // ❌ BAD - Mutates shared data
 * const data = { users: [] }
 * ctx = ctx.addResult("step1", { data })
 * data.users.push(user)  // ← Mutates context!
 * 
 * // ✅ GOOD - Creates new object
 * const data1 = { users: [] }
 * ctx = ctx.addResult("step1", { data: data1 })
 * const data2 = { users: [...data1.users, user] }
 * ctx = ctx.addResult("step2", { data: data2 })
 */
addResult(stepId: string, result: StepResult): WorkflowContext {
  // ... existing implementation
}
```

---

### Task 3: Add Session Cleanup Retry Logic

**Priority:** 🔴 CRITICAL  
**Effort:** 1 hour  
**Risk if Not Fixed:** Resource leaks, orphaned sessions accumulate over time  
**Blocking:** YES - Could exhaust resources in production

#### Problem Description

Session cleanup failures are silently ignored. If cleanup fails repeatedly, orphaned sessions will accumulate, potentially exhausting resources or hitting API limits.

**Current Code:**
```typescript
// src/workflow/opencode-agent-executor.ts:117-123
} finally {
  // 6. Cleanup session
  try {
    await this.client.session.delete({ path: { id: sessionId } })
  } catch (error) {
    // Best effort cleanup - don't throw
    console.warn(`[OpenCodeAgentExecutor] Failed to cleanup session ${sessionId}:`, error)
  }
}
```

**The Problem:**
- Single attempt to delete
- Failure is only logged as warning
- No retry mechanism
- No tracking of failed cleanups
- Could accumulate hundreds of orphaned sessions

#### Files to Modify

**Primary File:**
- `src/workflow/opencode-agent-executor.ts` (lines 117-123)

**New Files to Create:**
- `src/workflow/session-cleanup-queue.ts` (optional - for advanced retry queue)

**Related Files:**
- `src/utils/constants.ts` - Add cleanup retry constants

#### Implementation Steps

**Phase 1: Basic Retry Logic (Required)**

1. **Add retry constants**
   ```typescript
   // src/utils/constants.ts
   export const SESSION_CLEANUP_MAX_RETRIES = 3
   export const SESSION_CLEANUP_RETRY_DELAY_MS = 1000
   ```

2. **Implement retry logic**
   ```typescript
   } finally {
     // Attempt cleanup with retries
     let cleanupSuccess = false
     
     for (let attempt = 0; attempt < SESSION_CLEANUP_MAX_RETRIES; attempt++) {
       try {
         await this.client.session.delete({ path: { id: sessionId } })
         cleanupSuccess = true
         break  // Success
       } catch (error) {
         if (attempt === SESSION_CLEANUP_MAX_RETRIES - 1) {
           // Last attempt failed - log as error
           console.error(
             `[OpenCodeAgentExecutor] Failed to cleanup session ${sessionId} after ${SESSION_CLEANUP_MAX_RETRIES} attempts:`,
             error
           )
           // TODO: Add to cleanup queue for retry later
         } else {
           // Wait before retry (exponential backoff)
           const delay = SESSION_CLEANUP_RETRY_DELAY_MS * Math.pow(2, attempt)
           await new Promise(resolve => setTimeout(resolve, delay))
         }
       }
     }
     
     if (!cleanupSuccess) {
       // Track failed cleanup for monitoring
       this.trackFailedCleanup(sessionId)
     }
   }
   ```

3. **Add cleanup tracking**
   ```typescript
   // src/workflow/opencode-agent-executor.ts
   private failedCleanups: Set<string> = new Set()
   
   private trackFailedCleanup(sessionId: string): void {
     this.failedCleanups.add(sessionId)
     
     // Log warning if too many failures
     if (this.failedCleanups.size > 10) {
       console.error(
         `[OpenCodeAgentExecutor] WARNING: ${this.failedCleanups.size} sessions failed to cleanup. ` +
         `This may indicate a problem with the OpenCode API.`
       )
     }
   }
   
   // Add method to get failed cleanups for monitoring
   getFailedCleanups(): string[] {
     return Array.from(this.failedCleanups)
   }
   ```

**Phase 2: Advanced Cleanup Queue (Optional)**

For production systems with high volume, implement a background cleanup queue:

```typescript
// src/workflow/session-cleanup-queue.ts
export class SessionCleanupQueue {
  private queue: Map<string, { sessionId: string; attempts: number; lastAttempt: number }> = new Map()
  private isProcessing = false
  
  add(sessionId: string): void {
    this.queue.set(sessionId, {
      sessionId,
      attempts: 0,
      lastAttempt: Date.now()
    })
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }
  }
  
  private async processQueue(): Promise<void> {
    this.isProcessing = true
    
    while (this.queue.size > 0) {
      const now = Date.now()
      
      for (const [sessionId, item] of this.queue) {
        // Wait at least 5 seconds between attempts
        if (now - item.lastAttempt < 5000) {
          continue
        }
        
        try {
          await this.client.session.delete({ path: { id: sessionId } })
          this.queue.delete(sessionId)  // Success
        } catch (error) {
          item.attempts++
          item.lastAttempt = now
          
          // Give up after 10 attempts
          if (item.attempts >= 10) {
            console.error(`[SessionCleanupQueue] Giving up on session ${sessionId} after 10 attempts`)
            this.queue.delete(sessionId)
          }
        }
      }
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    this.isProcessing = false
  }
}
```

#### Testing Checklist

- [ ] Test successful cleanup on first attempt
- [ ] Test cleanup succeeds on retry (simulate transient failure)
- [ ] Test cleanup fails after max retries
- [ ] Test exponential backoff delays
- [ ] Test tracking of failed cleanups
- [ ] Test warning when too many failures
- [ ] (Optional) Test cleanup queue processes items

#### Success Criteria

- ✅ Cleanup retries up to 3 times with exponential backoff
- ✅ Failed cleanups are tracked and logged
- ✅ Warning emitted when too many failures occur
- ✅ No exceptions thrown from cleanup (still best-effort)
- ✅ Monitoring can access failed cleanup list

#### Code Reference

**Full implementation:**
```typescript
} finally {
  // Attempt cleanup with retries
  let cleanupSuccess = false
  
  for (let attempt = 0; attempt < SESSION_CLEANUP_MAX_RETRIES; attempt++) {
    try {
      await this.client.session.delete({ path: { id: sessionId } })
      cleanupSuccess = true
      break  // Success
    } catch (error) {
      if (attempt === SESSION_CLEANUP_MAX_RETRIES - 1) {
        // Last attempt failed - log as error
        console.error(
          `[OpenCodeAgentExecutor] Failed to cleanup session ${sessionId} after ${SESSION_CLEANUP_MAX_RETRIES} attempts:`,
          error
        )
      } else {
        // Wait before retry (exponential backoff)
        const delay = SESSION_CLEANUP_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(
          `[OpenCodeAgentExecutor] Cleanup attempt ${attempt + 1} failed for session ${sessionId}, ` +
          `retrying in ${delay}ms...`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  if (!cleanupSuccess) {
    this.trackFailedCleanup(sessionId)
  }
}
```

---

### Task 4: Fix File Path Injection Vulnerability

**Priority:** 🔴 CRITICAL  
**Effort:** 30 minutes  
**Risk if Not Fixed:** Security breach, arbitrary file access  
**Blocking:** YES - Security vulnerability

#### Problem Description

The agent file loading doesn't validate paths, allowing potential directory traversal attacks via `../` sequences in config files.

**Current Code:**
```typescript
// src/plugin/index.ts:98
if (agentConfig.file) {
  const filePath = join(directory, ".openagents", agentConfig.file)
  const agent = loadAgentFromFile(filePath)
}
```

**Attack Vector:**
```json
// Malicious .openagents/config.json
{
  "agents": {
    "evil": {
      "file": "../../../etc/passwd"  // ← Escapes .openagents directory!
    }
  }
}
```

**Result:** Could read arbitrary files on the system.

#### Files to Modify

**Primary File:**
- `src/plugin/index.ts` (lines 96-106)

**New Files to Create:**
- `src/utils/path-security.ts` (path validation utilities)

#### Implementation Steps

1. **Create path validation utility**
   ```typescript
   // src/utils/path-security.ts
   import { resolve, normalize } from 'node:path'
   
   /**
    * Check if a file path is safe (doesn't escape base directory)
    */
   export function isPathSafe(basePath: string, filePath: string): boolean {
     const resolvedBase = resolve(basePath)
     const resolvedPath = resolve(basePath, filePath)
     
     // Path must start with base path
     return resolvedPath.startsWith(resolvedBase + path.sep) || 
            resolvedPath === resolvedBase
   }
   
   /**
    * Safely join paths and validate result
    * @throws Error if path escapes base directory
    */
   export function safeJoin(basePath: string, ...paths: string[]): string {
     const joined = join(basePath, ...paths)
     
     if (!isPathSafe(basePath, joined)) {
       throw new Error(
         `Invalid path: "${paths.join('/')}" attempts to escape base directory "${basePath}"`
       )
     }
     
     return joined
   }
   ```

2. **Update agent loading to use safe path**
   ```typescript
   // src/plugin/index.ts
   import { safeJoin } from "../utils/path-security"
   
   if (agentConfig.file) {
     try {
       const basePath = join(directory, ".openagents")
       const filePath = safeJoin(basePath, agentConfig.file)
       
       const { loadAgentFromFile: loadAgentFromFile2 } = await import("../agents/loader")
       const agent = loadAgentFromFile2(filePath)
       
       if (agent) {
         agent.name = name
         agentMap.set(name, agent)
       }
     } catch (error) {
       console.error(
         `[${PLUGIN_NAME}] Failed to load agent "${name}" from file "${agentConfig.file}":`,
         error instanceof Error ? error.message : error
       )
       // Continue loading other agents
     }
   }
   ```

3. **Add validation to agent directories**
   ```typescript
   // src/plugin/index.ts
   const agentDirs = [
     safeJoin(directory, ".openagents", config.agents_dir),
     safeJoin(directory, ".openagents", "agents"),
   ]
   ```

4. **Add tests for path validation**
   ```typescript
   // test/utils/path-security.test.ts
   import { describe, test, expect } from "bun:test"
   import { isPathSafe, safeJoin } from "../../src/utils/path-security"
   
   describe("Path Security", () => {
     test("allows safe paths", () => {
       expect(isPathSafe("/base", "/base/file.txt")).toBe(true)
       expect(isPathSafe("/base", "/base/sub/file.txt")).toBe(true)
     })
     
     test("blocks directory traversal", () => {
       expect(isPathSafe("/base", "/base/../etc/passwd")).toBe(false)
       expect(isPathSafe("/base", "/etc/passwd")).toBe(false)
     })
     
     test("safeJoin throws on unsafe paths", () => {
       expect(() => safeJoin("/base", "../etc/passwd")).toThrow()
       expect(() => safeJoin("/base", "../../etc/passwd")).toThrow()
     })
     
     test("safeJoin allows safe paths", () => {
       expect(safeJoin("/base", "file.txt")).toBe("/base/file.txt")
       expect(safeJoin("/base", "sub/file.txt")).toBe("/base/sub/file.txt")
     })
   })
   ```

#### Testing Checklist

- [ ] Test loading agent from valid path
- [ ] Test loading agent from subdirectory
- [ ] Test blocking `../` traversal
- [ ] Test blocking absolute paths
- [ ] Test error message is helpful
- [ ] Test other agents still load after one fails

#### Success Criteria

- ✅ All agent file paths are validated
- ✅ Directory traversal attacks are blocked
- ✅ Error messages don't leak system paths
- ✅ Valid paths still work correctly
- ✅ Tests cover attack vectors

#### Code Reference

**Full implementation:**
```typescript
// src/utils/path-security.ts
import { resolve, join, sep } from 'node:path'

export function isPathSafe(basePath: string, filePath: string): boolean {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(basePath, filePath)
  
  return resolvedPath.startsWith(resolvedBase + sep) || 
         resolvedPath === resolvedBase
}

export function safeJoin(basePath: string, ...paths: string[]): string {
  const joined = join(basePath, ...paths)
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(joined)
  
  if (!resolvedPath.startsWith(resolvedBase + sep) && resolvedPath !== resolvedBase) {
    throw new Error(
      `Invalid path: "${paths.join('/')}" attempts to escape base directory`
    )
  }
  
  return joined
}
```

---

## 🟡 HIGH PRIORITY (Fix Before Scaling)

### Task 5: Refactor Agent Map Building

**Priority:** 🟡 HIGH  
**Effort:** 2 hours  
**Risk if Not Fixed:** Hard to maintain, confusing logic, potential bugs  
**Blocking:** NO - Works but is error-prone

#### Problem Description

Agent map building has multiple mutation points scattered across the initialization code, making it hard to understand the final state and easy to introduce bugs.

**Current Code:**
```typescript
// src/plugin/index.ts:86-122
// 1. Load from directories
const agentMap = loadAgents(agentDirs)

// 2. Load from config files (mutation #1)
if (config.agents) {
  for (const [name, agentConfig] of Object.entries(config.agents)) {
    if (agentConfig.file) {
      const agent = loadAgentFromFile(filePath)
      if (agent) {
        agent.name = name  // ← Mutation
        agentMap.set(name, agent)  // ← Mutation
      }
    }
  }
}

// 3. Filter disabled (mutation #2)
const disabledSet = new Set(config.disabled_agents ?? [])
for (const name of disabledSet) {
  agentMap.delete(name)  // ← Mutation
}

// 4. Filter by enabled flag (mutation #3)
if (config.agents) {
  for (const [name, agentConfig] of Object.entries(config.agents)) {
    if (agentConfig.enabled === false) {
      agentMap.delete(name)  // ← Mutation
    }
  }
}
```

**Issues:**
- 4 separate mutation points
- Hard to trace final state
- Duplicate iteration over `config.agents`
- Easy to introduce bugs when modifying

#### Files to Modify

**Primary File:**
- `src/plugin/index.ts` (lines 86-122)

**New Files to Create:**
- `src/agents/agent-map-builder.ts` (extracted logic)

#### Implementation Steps

1. **Create agent map builder module**
   ```typescript
   // src/agents/agent-map-builder.ts
   import { join } from "node:path"
   import { loadAgents, loadAgentFromFile } from "./loader"
   import type { AgentDefinition } from "./types"
   import type { OpenAgentsConfig } from "../plugin/config"
   import { safeJoin } from "../utils/path-security"
   
   export interface AgentMapBuilderOptions {
     directory: string
     agentDirs: string[]
     config: OpenAgentsConfig
   }
   
   /**
    * Build agent map from multiple sources in a single, clear flow
    */
   export function buildAgentMap(options: AgentMapBuilderOptions): Map<string, AgentDefinition> {
     const { directory, agentDirs, config } = options
     const map = new Map<string, AgentDefinition>()
     
     // Step 1: Load from directories
     const directoryAgents = loadAgents(agentDirs)
     for (const [name, agent] of directoryAgents) {
       map.set(name, agent)
     }
     
     // Step 2: Load from config files (overrides directory versions)
     if (config.agents) {
       for (const [name, agentConfig] of Object.entries(config.agents)) {
         if (agentConfig.file) {
           try {
             const basePath = join(directory, ".openagents")
             const filePath = safeJoin(basePath, agentConfig.file)
             const agent = loadAgentFromFile(filePath)
             
             if (agent) {
               agent.name = name
               map.set(name, agent)  // Overrides if exists
             }
           } catch (error) {
             console.error(
               `[AgentMapBuilder] Failed to load agent "${name}":`,
               error instanceof Error ? error.message : error
             )
           }
         }
       }
     }
     
     // Step 3: Filter disabled agents (single pass)
     const disabledNames = getDisabledAgentNames(config)
     for (const name of disabledNames) {
       map.delete(name)
     }
     
     return map
   }
   
   /**
    * Get all disabled agent names from config
    */
   function getDisabledAgentNames(config: OpenAgentsConfig): Set<string> {
     const disabled = new Set<string>()
     
     // Add explicitly disabled agents
     if (config.disabled_agents) {
       for (const name of config.disabled_agents) {
         disabled.add(name)
       }
     }
     
     // Add agents with enabled: false
     if (config.agents) {
       for (const [name, agentConfig] of Object.entries(config.agents)) {
         if (agentConfig.enabled === false) {
           disabled.add(name)
         }
       }
     }
     
     return disabled
   }
   ```

2. **Update plugin to use builder**
   ```typescript
   // src/plugin/index.ts
   import { buildAgentMap } from "../agents/agent-map-builder"
   
   // Replace lines 86-122 with:
   const agentMap = buildAgentMap({
     directory,
     agentDirs: [
       join(directory, ".openagents", config.agents_dir),
       join(directory, ".openagents", "agents"),
     ],
     config
   })
   ```

3. **Add tests for builder**
   ```typescript
   // test/agents/agent-map-builder.test.ts
   import { describe, test, expect, beforeEach, afterEach } from "bun:test"
   import { buildAgentMap } from "../../src/agents/agent-map-builder"
   import { mkdirSync, writeFileSync, rmSync } from "node:fs"
   import { join } from "node:path"
   
   describe("AgentMapBuilder", () => {
     const testDir = "/tmp/openagents-test"
     
     beforeEach(() => {
       mkdirSync(join(testDir, ".openagents/agents"), { recursive: true })
     })
     
     afterEach(() => {
       rmSync(testDir, { recursive: true, force: true })
     })
     
     test("loads agents from directory", () => {
       // Create test agent file
       writeFileSync(
         join(testDir, ".openagents/agents/test.md"),
         "---\ndescription: Test agent\n---\nYou are a test agent"
       )
       
       const map = buildAgentMap({
         directory: testDir,
         agentDirs: [join(testDir, ".openagents/agents")],
         config: { enabled: true }
       })
       
       expect(map.has("test")).toBe(true)
     })
     
     test("filters disabled agents", () => {
       writeFileSync(
         join(testDir, ".openagents/agents/test.md"),
         "---\ndescription: Test agent\n---\nYou are a test agent"
       )
       
       const map = buildAgentMap({
         directory: testDir,
         agentDirs: [join(testDir, ".openagents/agents")],
         config: {
           enabled: true,
           disabled_agents: ["test"]
         }
       })
       
       expect(map.has("test")).toBe(false)
     })
     
     test("config file overrides directory agent", () => {
       // Directory version
       writeFileSync(
         join(testDir, ".openagents/agents/test.md"),
         "---\ndescription: Directory version\n---\nDirectory"
       )
       
       // Config version
       writeFileSync(
         join(testDir, ".openagents/custom.md"),
         "---\ndescription: Config version\n---\nConfig"
       )
       
       const map = buildAgentMap({
         directory: testDir,
         agentDirs: [join(testDir, ".openagents/agents")],
         config: {
           enabled: true,
           agents: {
             test: { file: "custom.md" }
           }
         }
       })
       
       expect(map.get("test")?.description).toBe("Config version")
     })
   })
   ```

#### Testing Checklist

- [ ] Test loading from directories
- [ ] Test loading from config files
- [ ] Test config overrides directory
- [ ] Test disabled_agents filtering
- [ ] Test enabled: false filtering
- [ ] Test combination of all sources
- [ ] Test error handling for missing files

#### Success Criteria

- ✅ Single function builds entire agent map
- ✅ Clear, linear flow (no scattered mutations)
- ✅ Easy to understand final state
- ✅ All existing functionality preserved
- ✅ Comprehensive tests

---

### Task 6: Generate TypeScript Type Definitions

**Priority:** 🟡 HIGH  
**Effort:** 30 minutes  
**Risk if Not Fixed:** Poor developer experience, no autocomplete  
**Blocking:** NO - Works but DX suffers

#### Problem Description

The package.json references `dist/plugin.d.ts` but type definitions aren't generated during build. This means TypeScript users don't get autocomplete or type checking.

**Current State:**
```json
// package.json
{
  "main": "dist/plugin.js",
  "types": "dist/plugin.d.ts",  // ← File doesn't exist!
}
```

**Impact:**
- No autocomplete in IDEs
- No type checking for plugin users
- Poor developer experience

#### Files to Modify

**Primary Files:**
- `package.json` (build script)
- `tsconfig.json` (compiler options)

#### Implementation Steps

1. **Update tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "esModuleInterop": true,
       "strict": true,
       "skipLibCheck": true,
       "declaration": true,           // ← Enable
       "declarationMap": true,        // ← Enable source maps
       "emitDeclarationOnly": false,  // ← Generate both JS and .d.ts
       "outDir": "./dist",
       "rootDir": "./src",
       "types": ["bun-types"]
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "test"]
   }
   ```

2. **Update build script**
   ```json
   {
     "scripts": {
       "build": "bun build src/plugin/index.ts --outfile dist/plugin.js --target bun --format esm && tsc --emitDeclarationOnly",
       "clean": "rm -rf dist",
       "dev": "bun run --watch src/plugin/index.ts",
       "test": "bun test",
       "typecheck": "tsc --noEmit"
     }
   }
   ```

3. **Create separate tsconfig for declarations**
   ```json
   // tsconfig.declarations.json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "declaration": true,
       "emitDeclarationOnly": true,
       "outDir": "./dist"
     },
     "include": ["src/plugin/index.ts"]
   }
   ```

4. **Update build script to use it**
   ```json
   {
     "scripts": {
       "build": "bun build src/plugin/index.ts --outfile dist/plugin.js --target bun --format esm && tsc -p tsconfig.declarations.json"
     }
   }
   ```

#### Testing Checklist

- [ ] Run `bun run build`
- [ ] Verify `dist/plugin.d.ts` exists
- [ ] Verify `dist/plugin.d.ts.map` exists (source map)
- [ ] Test importing in TypeScript project
- [ ] Verify autocomplete works
- [ ] Verify type checking works

#### Success Criteria

- ✅ Type definitions generated on build
- ✅ Source maps included
- ✅ Autocomplete works in IDEs
- ✅ Type checking works for consumers
- ✅ Build time increase is minimal

---

### Task 7: Add Agent Resolver Registration Guard

**Priority:** 🟡 HIGH  
**Effort:** 15 minutes  
**Risk if Not Fixed:** Confusing errors if called multiple times  
**Blocking:** NO - Edge case

#### Problem Description

The `AgentResolver.registerOpenCodeAgents()` method can be called multiple times, potentially causing confusion or duplicate registrations.

**Current Code:**
```typescript
// src/workflow/agent-resolver.ts:41-45
registerOpenCodeAgents(agentNames: string[]): void {
  for (const name of agentNames) {
    this.openCodeAgents.add(name)  // ← No guard
  }
}
```

**Issue:**
- Can be called multiple times
- No indication if already registered
- Could cause confusion in debugging

#### Files to Modify

**Primary File:**
- `src/workflow/agent-resolver.ts` (lines 25-45)

#### Implementation Steps

1. **Add registration flag**
   ```typescript
   export class AgentResolver {
     private openAgentsMap: Map<string, AgentDefinition>
     private openCodeAgents: Set<string>
     private openCodeAgentsRegistered = false  // ← Add flag
     
     // ... constructor
   }
   ```

2. **Add guard to registration method**
   ```typescript
   registerOpenCodeAgents(agentNames: string[]): void {
     if (this.openCodeAgentsRegistered) {
       throw new Error(
         "OpenCode agents already registered. " +
         "registerOpenCodeAgents() should only be called once."
       )
     }
     
     for (const name of agentNames) {
       this.openCodeAgents.add(name)
     }
     
     this.openCodeAgentsRegistered = true
   }
   ```

3. **Add test**
   ```typescript
   // test/workflow/agent-resolver.test.ts
   test("prevents double registration", () => {
     const resolver = new AgentResolver(new Map(), mockClient)
     
     resolver.registerOpenCodeAgents(["plan", "build"])
     
     expect(() => {
       resolver.registerOpenCodeAgents(["test"])
     }).toThrow("already registered")
   })
   ```

#### Testing Checklist

- [ ] Test single registration works
- [ ] Test double registration throws
- [ ] Test error message is clear
- [ ] Verify existing functionality unchanged

#### Success Criteria

- ✅ Registration can only happen once
- ✅ Clear error message on double registration
- ✅ Test coverage for guard
- ✅ No breaking changes

---

## 🟢 MEDIUM PRIORITY (Code Quality Improvements)

### Task 8: Improve Type Safety (any → unknown)

**Priority:** 🟢 MEDIUM  
**Effort:** 1 hour  
**Risk if Not Fixed:** Runtime errors, harder to debug  
**Blocking:** NO - Works but could be better

#### Problem Description

Several interfaces use `any` type, which bypasses TypeScript's type checking and could lead to runtime errors.

**Locations:**
```typescript
// src/workflow/opencode-agent-executor.ts:34-38
export interface AgentInput {
  input: any  // ← Too loose
  context: Record<string, any>  // ← Too loose
  [key: string]: any  // ← Too loose
}

// src/workflow/types.ts:162
export interface StepResult {
  data: any  // ← No type safety
}
```

#### Files to Modify

**Primary Files:**
- `src/workflow/opencode-agent-executor.ts`
- `src/workflow/types.ts`
- `src/workflow/context/context.ts`

#### Implementation Steps

1. **Replace `any` with `unknown`**
   ```typescript
   // src/workflow/opencode-agent-executor.ts
   export interface AgentInput {
     input: unknown  // ← Force type checking
     context: Record<string, unknown>
     [key: string]: unknown
   }
   ```

2. **Add generic type parameter to StepResult**
   ```typescript
   // src/workflow/types.ts
   export interface StepResult<T = unknown> {
     stepId: string
     success: boolean
     data: T  // ← Generic type
     error?: string
     duration?: number
     timestamp: number
   }
   ```

3. **Update WorkflowContext to use generic**
   ```typescript
   export interface WorkflowContext {
     workflowId: string
     input: unknown
     results: Map<string, StepResult<unknown>>
     metadata: WorkflowMetadata
   }
   ```

4. **Add type guards where needed**
   ```typescript
   // src/workflow/executors/transform-step.ts
   function isValidTransformData(data: unknown): data is Record<string, unknown> {
     return typeof data === 'object' && data !== null
   }
   
   execute(step: WorkflowStep, context: WorkflowContext): StepResult {
     const data = context.input
     
     if (!isValidTransformData(data)) {
       return {
         stepId: step.id,
         success: false,
         error: "Transform requires object input",
         timestamp: Date.now()
       }
     }
     
     // Now TypeScript knows data is Record<string, unknown>
     const transformed = this.applyTransform(data, step.transform)
     // ...
   }
   ```

#### Testing Checklist

- [ ] All TypeScript errors resolved
- [ ] Type guards added where needed
- [ ] Runtime validation added for critical paths
- [ ] Existing tests still pass
- [ ] No new `any` types introduced

#### Success Criteria

- ✅ No `any` types in core interfaces
- ✅ Type guards protect runtime code
- ✅ Better IDE autocomplete
- ✅ Catches more errors at compile time

---

### Task 9: Add Monitoring and Metrics

**Priority:** 🟢 MEDIUM  
**Effort:** 2 hours  
**Risk if Not Fixed:** Hard to debug production issues  
**Blocking:** NO - Nice to have

#### Problem Description

No metrics or monitoring for production debugging. Hard to diagnose issues like:
- How long do workflows take?
- How many sessions fail cleanup?
- What's the polling duration distribution?
- Which agents are used most?

#### Files to Modify

**New Files to Create:**
- `src/monitoring/metrics.ts`
- `src/monitoring/logger.ts`

**Files to Update:**
- `src/workflow/executor.ts`
- `src/workflow/opencode-agent-executor.ts`
- `src/plugin/index.ts`

#### Implementation Steps

1. **Create metrics collector**
   ```typescript
   // src/monitoring/metrics.ts
   export interface WorkflowMetrics {
     workflowId: string
     duration: number
     stepCount: number
     successfulSteps: number
     failedSteps: number
     startTime: number
     endTime: number
   }
   
   export interface SessionMetrics {
     sessionId: string
     agentName: string
     pollingAttempts: number
     pollingDuration: number
     cleanupSuccess: boolean
     cleanupAttempts: number
   }
   
   export class MetricsCollector {
     private workflowMetrics: WorkflowMetrics[] = []
     private sessionMetrics: SessionMetrics[] = []
     
     recordWorkflow(metrics: WorkflowMetrics): void {
       this.workflowMetrics.push(metrics)
       
       // Keep only last 100
       if (this.workflowMetrics.length > 100) {
         this.workflowMetrics.shift()
       }
     }
     
     recordSession(metrics: SessionMetrics): void {
       this.sessionMetrics.push(metrics)
       
       if (this.sessionMetrics.length > 100) {
         this.sessionMetrics.shift()
       }
     }
     
     getStats() {
       return {
         workflows: {
           total: this.workflowMetrics.length,
           avgDuration: this.avg(this.workflowMetrics.map(m => m.duration)),
           successRate: this.successRate(this.workflowMetrics)
         },
         sessions: {
           total: this.sessionMetrics.length,
           avgPollingDuration: this.avg(this.sessionMetrics.map(m => m.pollingDuration)),
           cleanupSuccessRate: this.sessionMetrics.filter(m => m.cleanupSuccess).length / this.sessionMetrics.length
         }
       }
     }
     
     private avg(numbers: number[]): number {
       return numbers.reduce((a, b) => a + b, 0) / numbers.length
     }
     
     private successRate(metrics: WorkflowMetrics[]): number {
       const successful = metrics.filter(m => m.failedSteps === 0).length
       return successful / metrics.length
     }
   }
   ```

2. **Integrate into workflow executor**
   ```typescript
   // src/workflow/executor.ts
   import { MetricsCollector } from "../monitoring/metrics"
   
   export class WorkflowExecutor {
     private metrics = new MetricsCollector()
     
     async execute(workflow: WorkflowDefinition, input: any): Promise<WorkflowResult> {
       const startTime = Date.now()
       
       try {
         // ... existing execution logic
         
         const endTime = Date.now()
         this.metrics.recordWorkflow({
           workflowId: workflow.id,
           duration: endTime - startTime,
           stepCount: workflow.steps.length,
           successfulSteps: context.results.filter(r => r.success).length,
           failedSteps: context.results.filter(r => !r.success).length,
           startTime,
           endTime
         })
         
         return result
       } catch (error) {
         // ... error handling
       }
     }
     
     getMetrics() {
       return this.metrics.getStats()
     }
   }
   ```

3. **Add logging utility**
   ```typescript
   // src/monitoring/logger.ts
   export enum LogLevel {
     DEBUG = 0,
     INFO = 1,
     WARN = 2,
     ERROR = 3
   }
   
   export class Logger {
     constructor(
       private component: string,
       private minLevel: LogLevel = LogLevel.INFO
     ) {}
     
     debug(message: string, ...args: any[]): void {
       if (this.minLevel <= LogLevel.DEBUG) {
         console.debug(`[${this.component}] ${message}`, ...args)
       }
     }
     
     info(message: string, ...args: any[]): void {
       if (this.minLevel <= LogLevel.INFO) {
         console.log(`[${this.component}] ${message}`, ...args)
       }
     }
     
     warn(message: string, ...args: any[]): void {
       if (this.minLevel <= LogLevel.WARN) {
         console.warn(`[${this.component}] ${message}`, ...args)
       }
     }
     
     error(message: string, ...args: any[]): void {
       if (this.minLevel <= LogLevel.ERROR) {
         console.error(`[${this.component}] ${message}`, ...args)
       }
     }
   }
   ```

#### Testing Checklist

- [ ] Metrics are collected for workflows
- [ ] Metrics are collected for sessions
- [ ] Stats calculation is correct
- [ ] Memory usage is bounded (only keep last 100)
- [ ] Logging works at different levels

#### Success Criteria

- ✅ Workflow metrics collected
- ✅ Session metrics collected
- ✅ Stats API available
- ✅ Memory-bounded storage
- ✅ Structured logging

---

## 📋 Implementation Order

### Week 1: Critical Fixes

**Day 1 (4 hours):**
- [ ] Task 1: Session polling error handling (1 hour)
- [ ] Task 2: Context immutability (2 hours)
- [ ] Task 3: Session cleanup retries (1 hour)

**Day 2 (3.5 hours):**
- [ ] Task 4: File path security (30 min)
- [ ] Task 5: Refactor agent map building (2 hours)
- [ ] Task 6: Generate type definitions (30 min)
- [ ] Task 7: Agent resolver guard (15 min)

### Week 2: Quality Improvements

**Day 3 (3 hours):**
- [ ] Task 8: Improve type safety (1 hour)
- [ ] Task 9: Add monitoring (2 hours)

**Day 4 (2 hours):**
- [ ] Integration testing
- [ ] Documentation updates
- [ ] Final review

---

## ✅ Completion Checklist

### Critical Path
- [ ] All CRITICAL tasks completed
- [ ] All tests passing
- [ ] TypeScript compiles with no errors
- [ ] Security audit passed
- [ ] Performance benchmarks acceptable

### Quality Assurance
- [ ] Code review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Migration guide written (if needed)

### Deployment Readiness
- [ ] Staging deployment successful
- [ ] Load testing completed
- [ ] Monitoring configured
- [ ] Rollback plan documented

---

## 📊 Progress Tracking

| Task | Status | Assignee | Started | Completed | Notes |
|------|--------|----------|---------|-----------|-------|
| Task 1: Session polling | ⏳ Pending | - | - | - | - |
| Task 2: Context immutability | ⏳ Pending | - | - | - | - |
| Task 3: Session cleanup | ⏳ Pending | - | - | - | - |
| Task 4: Path security | ⏳ Pending | - | - | - | - |
| Task 5: Agent map refactor | ⏳ Pending | - | - | - | - |
| Task 6: Type definitions | ⏳ Pending | - | - | - | - |
| Task 7: Resolver guard | ⏳ Pending | - | - | - | - |
| Task 8: Type safety | ⏳ Pending | - | - | - | - |
| Task 9: Monitoring | ⏳ Pending | - | - | - | - |

**Legend:**
- ⏳ Pending
- 🏗️ In Progress
- ✅ Complete
- ❌ Blocked

---

## 🔗 References

### Key Files
- `src/workflow/opencode-agent-executor.ts` - Session polling and cleanup
- `src/workflow/context/context.ts` - Context immutability
- `src/plugin/index.ts` - Agent loading and initialization
- `src/workflow/agent-resolver.ts` - Agent resolution
- `package.json` - Build configuration

### Documentation
- [Bun Documentation](https://bun.sh/docs)
- [OpenCode SDK](https://github.com/sst/opencode)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Review Documents
- Subagent review (December 19, 2025)
- PROJECT-STATUS.md
- CODE-QUALITY-ROADMAP.md

---

## 📞 Support

For questions or issues:
1. Check task details above
2. Review referenced files
3. Consult review documents
4. Ask for clarification

---

**Last Updated:** December 19, 2025  
**Next Review:** After critical tasks completion

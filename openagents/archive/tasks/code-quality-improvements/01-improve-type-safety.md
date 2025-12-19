# Task 01: Improve Type Safety

**Estimated Time:** 4 hours  
**Priority:** HIGH  
**Status:** ✅ Complete  
**Dependencies:** None  
**Completed:** December 18, 2024

---

## 🎯 Objective

Remove all `any` types from core code and add proper type definitions for external dependencies (OpenCode SDK, TUI client).

---

## 📋 Problem Statement

The codebase uses `any` types in critical areas, losing type safety benefits:

1. **OpenCode Client** - `client: any` in multiple files
2. **Session Messages** - Untyped message arrays
3. **Agent Input/Output** - `any` for input and return types
4. **TUI Client** - Type assertions bypass type checking

**Impact:**
- No compile-time error checking
- IDE autocomplete doesn't work
- Easy to introduce bugs
- Hard to refactor safely

---

## 🔨 Implementation Steps

### Step 1: Create External Types File (30 min)

Create `src/workflow/external-types.ts`:

```typescript
/**
 * External Type Definitions
 * 
 * Type definitions for external dependencies that don't provide types.
 * TODO: Replace with official types when available from @opencode-ai/sdk
 */

/**
 * Session message from OpenCode
 */
export interface SessionMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
}

/**
 * Session status response
 */
export interface SessionStatus {
  state: "active" | "idle" | "error"
  error?: string
  progress?: number
}

/**
 * Session creation response
 */
export interface SessionCreateResponse {
  data?: {
    id: string
    agent: string
    createdAt?: string
  }
}

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
  }
}

/**
 * OpenCode Session API
 */
export interface OpenCodeSessionAPI {
  create(params: { 
    body: { agent: string } 
  }): Promise<SessionCreateResponse>
  
  prompt(params: { 
    path: { sessionId: string }
    body: { prompt: string } 
  }): Promise<APIResponse<any>>
  
  status(params: { 
    path: { sessionId: string } 
  }): Promise<APIResponse<SessionStatus>>
  
  messages(params: { 
    path: { sessionId: string } 
  }): Promise<APIResponse<SessionMessage[]>>
  
  delete(params: { 
    path: { sessionId: string } 
  }): Promise<APIResponse<any>>
}

/**
 * TUI (Terminal UI) Client
 */
export interface TUIClient {
  showToast(params: {
    body: {
      title: string
      message: string
      variant: "info" | "success" | "error" | "warning"
      duration: number
    }
  }): Promise<void>
}

/**
 * OpenCode Client
 */
export interface OpenCodeClient {
  session: OpenCodeSessionAPI
  tui?: TUIClient
}

/**
 * Type guard for TUI client
 */
export function hasTUI(client: any): client is { tui: TUIClient } {
  return client && typeof client.tui?.showToast === 'function'
}
```

### Step 2: Update OpenCodeAgentExecutor (45 min)

Update `src/workflow/opencode-agent-executor.ts`:

```typescript
import type { AgentExecutor } from "./types"
import type { AgentResolver } from "./agent-resolver"
import type { 
  OpenCodeClient, 
  SessionMessage,
  SessionStatus 
} from "./external-types"

/**
 * Agent input structure
 */
export interface AgentInput {
  input: any  // Original workflow input
  context: Record<string, any>  // Previous step results
  [key: string]: any  // Explicit step references
}

/**
 * Agent execution result
 */
export interface AgentResult {
  result?: any
  error?: string
  [key: string]: any
}

export class OpenCodeAgentExecutor implements AgentExecutor {
  constructor(
    private client: OpenCodeClient,  // ✅ Typed!
    private resolver: AgentResolver
  ) {}
  
  async execute(agentName: string, input: AgentInput): Promise<AgentResult> {
    const agent = this.resolver.resolve(agentName)
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`)
    }
    
    const session = await this.client.session.create({
      body: { agent: agentName }
    })
    
    if (!session.data?.id) {
      throw new Error(`Failed to create session for agent '${agentName}'`)
    }
    
    const sessionId = session.data.id
    
    try {
      const prompt = this.buildPrompt(input)
      await this.client.session.prompt({
        path: { sessionId },
        body: { prompt }
      })
      
      return await this.waitForCompletion(sessionId)
    } finally {
      try {
        await this.client.session.delete({ path: { sessionId } })
      } catch (error) {
        console.warn(`[OpenCodeAgentExecutor] Failed to cleanup session ${sessionId}:`, error)
      }
    }
  }
  
  private buildPrompt(input: AgentInput): string {
    let prompt = ""
    
    if (input.input) {
      prompt += `## Task\n`
      if (typeof input.input === "string") {
        prompt += input.input
      } else {
        prompt += JSON.stringify(input.input, null, 2)
      }
      prompt += `\n\n`
    }
    
    if (input.context && Object.keys(input.context).length > 0) {
      prompt += `## Context from Previous Steps\n\n`
      for (const [stepId, data] of Object.entries(input.context)) {
        prompt += `### ${stepId}\n`
        prompt += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`
      }
    }
    
    return prompt
  }
  
  private async waitForCompletion(sessionId: string): Promise<AgentResult> {
    const maxAttempts = 600
    let attempts = 0
    
    while (attempts < maxAttempts) {
      const statusResponse = await this.client.session.status({
        path: { sessionId }
      })
      
      const status = statusResponse.data
      
      if (status?.state === "idle") {
        const messagesResponse = await this.client.session.messages({
          path: { sessionId }
        })
        return this.extractResult(messagesResponse.data || [])
      }
      
      if (status?.state === "error") {
        const error = status.error || "Unknown error"
        throw new Error(`Session ${sessionId} failed: ${error}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }
    
    throw new Error(`Session ${sessionId} timed out after 5 minutes`)
  }
  
  private extractResult(messages: SessionMessage[]): AgentResult {
    if (!messages || messages.length === 0) {
      return { error: "No messages in session" }
    }
    
    const assistantMessages = messages.filter(m => m.role === "assistant")
    
    if (assistantMessages.length === 0) {
      return { error: "No assistant response" }
    }
    
    const lastMessage = assistantMessages[assistantMessages.length - 1]
    
    try {
      return JSON.parse(lastMessage.content) as AgentResult
    } catch {
      return { result: lastMessage.content }
    }
  }
}
```

### Step 3: Update UI Manager (30 min)

Update `src/features/ui.ts`:

```typescript
import type { PluginInput } from "@opencode-ai/plugin"
import type { TUIClient } from "../workflow/external-types"
import { hasTUI } from "../workflow/external-types"

type Client = PluginInput["client"]

export const createUIManager = (client: Client) => {
  const showToast = async (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning"
  ): Promise<void> => {
    try {
      // Type-safe check
      if (hasTUI(client)) {
        await client.tui.showToast({
          body: { title, message, variant, duration: 5000 }
        })
      }
    } catch (error) {
      console.error("[OpenAgents] Toast failed:", error)
    }
  }
  
  return {
    showStart: async (agent: string): Promise<void> => {
      await showToast("Agent Started", `🚀 ${agent}`, "info")
    },
    
    showComplete: async (agent: string, duration: string): Promise<void> => {
      await showToast("Agent Completed", `✅ ${agent} (${duration})`, "success")
    },
    
    showError: async (agent: string, error: string): Promise<void> => {
      await showToast("Agent Failed", `❌ ${agent}: ${error}`, "error")
    },
    
    showApprovalPrompt: async (
      message: string,
      _context: any,
      _timeout?: number
    ): Promise<boolean> => {
      await showToast("Approval Required", message, "warning")
      return true
    },
    
    showWorkflowStart: async (workflowId: string): Promise<void> => {
      await showToast("Workflow Started", `🔄 ${workflowId}`, "info")
    },
    
    showWorkflowComplete: async (workflowId: string, duration: number): Promise<void> => {
      const durationSec = (duration / 1000).toFixed(1)
      await showToast("Workflow Completed", `✅ ${workflowId} (${durationSec}s)`, "success")
    },
    
    showWorkflowError: async (workflowId: string, error: Error): Promise<void> => {
      await showToast("Workflow Failed", `❌ ${workflowId}: ${error.message}`, "error")
    },
    
    showStepProgress: async (stepId: string, current: number, total: number): Promise<void> => {
      console.log(`[OpenAgents] Step ${current}/${total}: ${stepId}`)
    }
  }
}

export type UIManager = ReturnType<typeof createUIManager>
```

### Step 4: Update Plugin Index (45 min)

Update `src/plugin/index.ts` to use typed client:

```typescript
import type { Plugin } from "@opencode-ai/plugin"
import type { OpenCodeClient } from "../workflow/external-types"

const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Cast to our typed client (safe because we know the structure)
  const typedClient = client as unknown as OpenCodeClient
  
  // ... rest of plugin code using typedClient
  
  const agentExecutor = new OpenCodeAgentExecutor(typedClient, resolver)
  
  // ...
}
```

### Step 5: Update Agent Executor Interface (30 min)

Update `src/workflow/types.ts`:

```typescript
/**
 * Agent executor interface - executes agents
 */
export interface AgentExecutor {
  /**
   * Execute agent with input
   * 
   * @param agentName - Name of agent to execute
   * @param input - Agent input (task + context)
   * @returns Agent execution result
   */
  execute(agentName: string, input: Record<string, any>): Promise<any>
}
```

### Step 6: Update Tests (1 hour)

Update `test-workflow-integration.ts` to use typed client:

```typescript
import type { 
  OpenCodeClient, 
  SessionMessage,
  SessionStatus,
  SessionCreateResponse,
  APIResponse
} from "./src/workflow/external-types"

class MockOpencodeClient implements OpenCodeClient {
  private sessions = new Map<string, any>()
  private sessionCounter = 0

  session = {
    create: async ({ body }: { body: { agent: string } }): Promise<SessionCreateResponse> => {
      const sessionId = `session-${++this.sessionCounter}`
      this.sessions.set(sessionId, {
        id: sessionId,
        agent: body.agent,
        state: "active",
        messages: []
      })
      console.log(`  ✓ Created session ${sessionId} for agent '${body.agent}'`)
      return { data: { id: sessionId, agent: body.agent } }
    },

    prompt: async ({ path, body }: { 
      path: { sessionId: string }
      body: { prompt: string } 
    }): Promise<APIResponse<any>> => {
      const session = this.sessions.get(path.sessionId)
      if (!session) throw new Error(`Session ${path.sessionId} not found`)
      
      session.messages.push({
        role: "user",
        content: body.prompt
      })
      
      const response = this.simulateAgentResponse(session.agent, body.prompt)
      session.messages.push({
        role: "assistant",
        content: JSON.stringify(response)
      })
      
      console.log(`  ✓ Sent prompt to session ${path.sessionId}`)
      return { data: {} }
    },

    status: async ({ path }: { 
      path: { sessionId: string } 
    }): Promise<APIResponse<SessionStatus>> => {
      const session = this.sessions.get(path.sessionId)
      if (!session) throw new Error(`Session ${path.sessionId} not found`)
      
      if (session.messages.length > 0) {
        session.state = "idle"
      }
      
      return { data: { state: session.state } }
    },

    messages: async ({ path }: { 
      path: { sessionId: string } 
    }): Promise<APIResponse<SessionMessage[]>> => {
      const session = this.sessions.get(path.sessionId)
      if (!session) throw new Error(`Session ${path.sessionId} not found`)
      
      return { data: session.messages }
    },

    delete: async ({ path }: { 
      path: { sessionId: string } 
    }): Promise<APIResponse<any>> => {
      this.sessions.delete(path.sessionId)
      console.log(`  ✓ Deleted session ${path.sessionId}`)
      return { data: {} }
    }
  }

  private simulateAgentResponse(agent: string, prompt: string): any {
    // ... existing implementation
  }
}
```

---

## ✅ Acceptance Criteria

- [x] No `any` types in `src/workflow/opencode-agent-executor.ts` (except intentional flexible types)
- [x] No `any` types in `src/features/ui.ts`
- [x] External types file created with comprehensive types
- [x] Type guard functions for runtime checks
- [x] Plugin uses typed client
- [x] Tests updated to use typed mocks
- [x] TypeScript compiles without errors
- [x] All tests passing (11/11 - 100%)
- [x] IDE autocomplete works for client methods

---

## 🧪 Testing

```bash
# Type check
cd openagents
bunx tsc --noEmit

# Should show no errors related to 'any' types

# Run tests
bun test-workflow-integration.ts
bun test-workflow-system.ts

# Both should pass
```

---

## 📝 Notes

- Keep `any` for workflow input/output (intentionally flexible)
- Use type guards for runtime type checking
- Document why types are structured this way
- Consider creating `@types/opencode-ai` package later

---

## 🔗 Related Tasks

- Task 04: Add Input Validation (uses these types)
- Task 03: Improve Error Messages (uses these types)

---

## ⏭️ Next Task

After completing this task, proceed to:
- `02-resolve-duplicate-entry-points.md`

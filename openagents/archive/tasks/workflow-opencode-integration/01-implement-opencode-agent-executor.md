# Task 01: Implement OpenCodeAgentExecutor

**Estimated Time:** 45 minutes  
**Priority:** High  
**Status:** ⏳ Pending

---

## 🎯 Objective

Implement `OpenCodeAgentExecutor` class that uses OpenCode SDK to execute agents via sessions.

---

## 📋 Requirements

1. Create `src/workflow/opencode-agent-executor.ts`
2. Implement `AgentExecutor` interface
3. Use `client.session.*` APIs to:
   - Create sessions for agents
   - Send prompts with context
   - Wait for completion
   - Extract results
   - Clean up sessions
4. Handle errors and timeouts
5. Build proper prompts from workflow context

---

## 🔨 Implementation

### File: `src/workflow/opencode-agent-executor.ts`

```typescript
/**
 * OpenCode Agent Executor
 * 
 * Executes agents using OpenCode SDK via session API.
 * Creates a session for each agent execution, sends prompt with context,
 * waits for completion, and extracts results.
 */

import type { AgentExecutor } from "./types"
import type { AgentResolver, ResolvedAgent } from "./agent-resolver"

// Type for OpenCode client (from @opencode-ai/plugin)
type OpencodeClient = any // Will be properly typed from plugin context

export class OpenCodeAgentExecutor implements AgentExecutor {
  constructor(
    private client: OpencodeClient,
    private resolver: AgentResolver
  ) {}
  
  /**
   * Execute agent via OpenCode session
   */
  async execute(agentName: string, input: any): Promise<any> {
    // 1. Resolve agent
    const agent = this.resolver.resolve(agentName)
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`)
    }
    
    // 2. Create session for agent
    const session = await this.createSession(agentName)
    
    try {
      // 3. Build and send prompt
      const prompt = this.buildPrompt(input, agent)
      await this.sendPrompt(session.id, prompt)
      
      // 4. Wait for completion
      const result = await this.waitForCompletion(session.id)
      
      return result
    } finally {
      // 5. Clean up session
      await this.cleanupSession(session.id)
    }
  }
  
  /**
   * Create OpenCode session for agent
   */
  private async createSession(agentName: string): Promise<{ id: string }> {
    const response = await this.client.session.create({
      body: {
        agent: agentName,
        // OpenCode automatically applies:
        // - Agent's configured tools
        // - Agent's configured MCPs
        // - Agent's model settings
      }
    })
    
    if (!response.data?.id) {
      throw new Error(`Failed to create session for agent '${agentName}'`)
    }
    
    return { id: response.data.id }
  }
  
  /**
   * Send prompt to session
   */
  private async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    await this.client.session.prompt({
      path: { sessionId },
      body: { prompt }
    })
  }
  
  /**
   * Wait for session to complete
   */
  private async waitForCompletion(sessionId: string): Promise<any> {
    const maxAttempts = 600 // 5 minutes (600 * 500ms)
    let attempts = 0
    
    while (attempts < maxAttempts) {
      const status = await this.client.session.status({
        path: { sessionId }
      })
      
      // Check if session is idle (completed)
      if (status.data?.state === "idle") {
        return await this.extractResult(sessionId)
      }
      
      // Check if session errored
      if (status.data?.state === "error") {
        const error = status.data?.error || "Unknown error"
        throw new Error(`Session ${sessionId} failed: ${error}`)
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
    }
    
    throw new Error(`Session ${sessionId} timed out after 5 minutes`)
  }
  
  /**
   * Extract result from session messages
   */
  private async extractResult(sessionId: string): Promise<any> {
    const messages = await this.client.session.messages({
      path: { sessionId }
    })
    
    if (!messages.data || messages.data.length === 0) {
      return { error: "No messages in session" }
    }
    
    // Find last assistant message
    const assistantMessages = messages.data.filter((m: any) => 
      m.role === "assistant"
    )
    
    if (assistantMessages.length === 0) {
      return { error: "No assistant response" }
    }
    
    const lastMessage = assistantMessages[assistantMessages.length - 1]
    
    // Try to parse as JSON, otherwise return text
    try {
      return JSON.parse(lastMessage.content)
    } catch {
      return { result: lastMessage.content }
    }
  }
  
  /**
   * Clean up session
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    try {
      await this.client.session.delete({
        path: { sessionId }
      })
    } catch (error) {
      // Log but don't throw - cleanup is best effort
      console.warn(`Failed to cleanup session ${sessionId}:`, error)
    }
  }
  
  /**
   * Build prompt from workflow input and context
   */
  private buildPrompt(input: any, agent: ResolvedAgent): string {
    let prompt = ""
    
    // Add task/input
    if (input.input) {
      prompt += `## Task\n`
      if (typeof input.input === "string") {
        prompt += input.input
      } else {
        prompt += JSON.stringify(input.input, null, 2)
      }
      prompt += `\n\n`
    }
    
    // Add context from previous steps
    if (input.context && Object.keys(input.context).length > 0) {
      prompt += `## Context from Previous Steps\n\n`
      for (const [stepId, data] of Object.entries(input.context)) {
        prompt += `### ${stepId}\n`
        prompt += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`
      }
    }
    
    return prompt
  }
}
```

---

## ✅ Acceptance Criteria

- [ ] File `src/workflow/opencode-agent-executor.ts` created
- [ ] Implements `AgentExecutor` interface
- [ ] Creates sessions using `client.session.create()`
- [ ] Sends prompts using `client.session.prompt()`
- [ ] Polls status using `client.session.status()`
- [ ] Extracts results from `client.session.messages()`
- [ ] Cleans up sessions using `client.session.delete()`
- [ ] Handles errors and timeouts properly
- [ ] Builds prompts with task and context
- [ ] TypeScript compiles without errors

---

## 🧪 Testing

```typescript
// Manual test
const client = /* get from plugin context */
const resolver = new AgentResolver(agentMap, client)
const executor = new OpenCodeAgentExecutor(client, resolver)

// Test execution
const result = await executor.execute("plan", {
  input: "Create a login feature",
  context: {}
})

console.log("Result:", result)
```

---

## 📝 Notes

- Use `any` type for `OpencodeClient` initially - will be properly typed from plugin
- Session polling interval: 500ms (reasonable balance)
- Max timeout: 5 minutes (600 attempts * 500ms)
- Cleanup is best-effort (don't throw on cleanup errors)
- Try to parse result as JSON, fallback to text

---

## 🔗 Related Files

- `src/workflow/types.ts` - `AgentExecutor` interface
- `src/workflow/agent-resolver.ts` - `AgentResolver` class
- `src/workflow/executors/agent.ts` - `AgentStepExecutor` (uses this)

---

## ⏭️ Next Task

After completing this task, proceed to:
- `02-integrate-with-plugin.md` - Integrate executor with plugin

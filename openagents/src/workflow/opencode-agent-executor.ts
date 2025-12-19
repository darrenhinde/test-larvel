/**
 * OpenCode Agent Executor
 * 
 * Executes agents using OpenCode SDK via session API.
 * Creates a session for each agent execution, sends prompt with context,
 * waits for completion, and extracts results.
 */

import type { AgentExecutor } from "./types"
import type { AgentResolver } from "./agent-resolver"
import type { 
  OpencodeClient,
  Session,
  SessionStatus,
  Message,
  Part,
  TextPart,
  TextPartInput
} from "@opencode-ai/sdk"
import { 
  createNotFoundError,
  createTimeoutError 
} from "../utils/errors"
import { validateString, validateObject } from "../utils/validation"
import { 
  POLL_INTERVAL_MS,
  MAX_POLL_ATTEMPTS,
  MAX_POLL_DURATION_MS,
  SESSION_CLEANUP_MAX_RETRIES,
  SESSION_CLEANUP_RETRY_DELAY_MS
} from "../utils/constants"

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

/**
 * OpenCode Agent Executor
 * 
 * Executes workflow agents by creating OpenCode sessions.
 */
export class OpenCodeAgentExecutor implements AgentExecutor {
  private failedCleanups: Set<string> = new Set()
  
  constructor(
    private client: OpencodeClient,
    private resolver: AgentResolver
  ) {}
  
  /**
   * Execute agent via OpenCode session
   */
  async execute(agentName: string, input: AgentInput): Promise<AgentResult> {
    // Validate inputs
    validateString(agentName, 'agentName', { minLength: 1 })
    validateObject(input, 'input')
    
    // 1. Resolve agent
    const agent = this.resolver.resolve(agentName)
    if (!agent) {
      const availableAgents = this.resolver.listAgentNames()
      throw createNotFoundError(
        "Agent",
        agentName,
        availableAgents,
        "Check the agent name spelling or add the agent to .openagents/agents/"
      )
    }
    
    // 2. Create session (no agent parameter - agent is specified in prompt)
    const sessionResponse = await this.client.session.create({
      body: { 
        title: `Workflow: ${agentName}` 
      }
    })
    
    if (!sessionResponse.data?.id) {
      throw new Error(
        `Failed to create session for agent '${agentName}'.\n` +
        `Error: ${sessionResponse.error ? JSON.stringify(sessionResponse.error) : 'Unknown error'}\n` +
        `Hint: Check OpenCode server status and agent configuration.`
      )
    }
    
    const sessionId = sessionResponse.data.id
    
    try {
      // 3. Build prompt parts
      const promptText = this.buildPrompt(input)
      const parts: TextPartInput[] = [{
        type: "text",
        text: promptText
      }]
      
      // 4. Send prompt with agent specification
      await this.client.session.prompt({
        path: { id: sessionId },
        body: {
          agent: agentName,  // Agent is specified here, not in session.create()
          parts
        }
      })
      
      // 5. Wait for completion
      return await this.waitForCompletion(sessionId)
    } finally {
      // 6. Cleanup session with retry logic
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
  }
  
  /**
   * Build prompt from workflow input and context
   */
  private buildPrompt(input: AgentInput): string {
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
  
  /**
   * Wait for session to complete
   * 
   * Polls session status at regular intervals until idle.
   * Handles error statuses, network failures, and timeouts.
   * 
   * Timeout after maximum duration or maximum attempts.
   */
  private async waitForCompletion(sessionId: string): Promise<AgentResult> {
    let attempts = 0
    let consecutiveErrors = 0
    const startTime = Date.now()
    
    while (attempts < MAX_POLL_ATTEMPTS) {
      // Check elapsed time as backup timeout mechanism
      const elapsed = Date.now() - startTime
      if (elapsed > MAX_POLL_DURATION_MS) {
        throw createTimeoutError(
          `Session ${sessionId}`,
          MAX_POLL_DURATION_MS,
          { attempts, sessionId, reason: 'duration exceeded', elapsedMs: elapsed }
        )
      }
      
      try {
        // Status returns { data: { [sessionId]: SessionStatus } }
        const statusResponse = await this.client.session.status()
        
        if (!statusResponse.data) {
          throw new Error(
            `Failed to get session status.\n` +
            `Error: ${statusResponse.error ? JSON.stringify(statusResponse.error) : 'Unknown error'}`
          )
        }
        
        const status = statusResponse.data[sessionId]
        
        if (!status) {
          throw new Error(
            `Session ${sessionId} not found in status response.\n` +
            `The session may have been deleted or never existed.\n` +
            `Available sessions: ${Object.keys(statusResponse.data).join(", ")}`
          )
        }
        
        // Reset consecutive error counter on successful status check
        consecutiveErrors = 0
        
        // Handle error status - session failed on OpenCode side
        if (status.type === "error") {
          return {
            error: status.error?.message || "Session failed with unknown error"
          }
        }
        
        // Check status type
        if (status.type === "idle") {
          // Session completed - get messages
          const messagesResponse = await this.client.session.messages({
            path: { id: sessionId }
          })
          
          if (!messagesResponse.data) {
            throw new Error(
              `Failed to get session messages.\n` +
              `Error: ${messagesResponse.error ? JSON.stringify(messagesResponse.error) : 'Unknown error'}`
            )
          }
          
          return this.extractResult(messagesResponse.data)
        }
        
        if (status.type === "retry") {
          // Session is retrying - wait for the specified next time
          const waitTime = status.next || POLL_INTERVAL_MS
          await new Promise(resolve => setTimeout(resolve, waitTime))
          attempts++
          continue
        }
        
        // Status is "busy" - keep waiting
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
        attempts++
        
      } catch (error) {
        // Handle network errors and API failures during polling
        console.error(`[OpenCodeAgentExecutor] Polling error (attempt ${attempts + 1}):`, error)
        consecutiveErrors++
        attempts++
        
        // If we've had multiple consecutive failures, bail out
        if (consecutiveErrors >= 3) {
          return {
            error: `Failed to poll session status after ${consecutiveErrors} consecutive errors: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        }
        
        // Otherwise, wait and retry
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
      }
    }
    
    // Reached maximum attempts
    throw createTimeoutError(
      `Session ${sessionId}`,
      MAX_POLL_DURATION_MS,
      { attempts, sessionId, maxAttempts: MAX_POLL_ATTEMPTS, reason: 'max attempts exceeded' }
    )
  }
  
  /**
   * Extract result from session messages
   * 
   * Finds the last assistant message and tries to parse as JSON.
   * Falls back to returning the text content.
   */
  private extractResult(messages: { info: Message; parts: Part[] }[]): AgentResult {
    if (!messages || messages.length === 0) {
      return { 
        error: "No messages in session. The agent may not have responded." 
      }
    }
    
    // Find last assistant message
    const assistantMessages = messages.filter(m => 
      m.info.role === "assistant"
    )
    
    if (assistantMessages.length === 0) {
      return { 
        error: `No assistant response found. Received ${messages.length} message(s) but none from assistant.` 
      }
    }
    
    const lastMessage = assistantMessages[assistantMessages.length - 1]
    
    // Extract text from parts
    const textParts = lastMessage.parts
      .filter((p): p is TextPart => p.type === "text")
      .map(p => p.text)
      .join("\n")
    
    if (!textParts) {
      return {
        error: "Assistant message has no text content"
      }
    }
    
    // Try to parse as JSON, otherwise return text
    try {
      return JSON.parse(textParts) as AgentResult
    } catch {
      return { result: textParts }
    }
  }
}

/**
 * UI Manager
 * 
 * Manages toast notifications for agent lifecycle events.
 */

import type { PluginInput } from "@opencode-ai/plugin"

type Client = PluginInput["client"]

/**
 * Type guard to check if client has TUI capabilities
 */
function hasTUI(client: Client): client is Client & { tui: NonNullable<Client["tui"]> } {
  return client && typeof client.tui?.showToast === 'function'
}

// Impure: UI manager
export const createUIManager = (client: Client) => {
  const showToast = async (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning"
  ): Promise<void> => {
    try {
      // Type-safe check using type guard
      if (hasTUI(client)) {
        await client.tui.showToast({
          body: { title, message, variant, duration: 5000 }
        })
      }
    } catch (error) {
      // Silently fail - toasts are nice-to-have
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
    
    // Workflow UI methods
    showApprovalPrompt: async (
      message: string,
      _context: any,
      _timeout?: number
    ): Promise<boolean> => {
      // For now, auto-approve (can be enhanced later with actual prompts)
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
      // Optional: can show progress toasts
      // For now, just log to console to avoid toast spam
      console.log(`[OpenAgents] Step ${current}/${total}: ${stepId}`)
    }
  }
}

export type UIManager = ReturnType<typeof createUIManager>

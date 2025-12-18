/**
 * UI Manager
 * 
 * Manages toast notifications for agent lifecycle events.
 */

import type { PluginInput } from "@opencode-ai/plugin"

type Client = PluginInput["client"]

// Impure: UI manager
export const createUIManager = (client: Client) => {
  const showToast = async (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning"
  ): Promise<void> => {
    try {
      // Type assertion for tui
      const tuiClient = client as any
      if (tuiClient.tui?.showToast) {
        await tuiClient.tui.showToast({
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
    }
  }
}

export type UIManager = ReturnType<typeof createUIManager>

import { handleSessionCreated } from "./on-session-created";

/**
 * Lifecycle Module
 * 
 * Purpose: Manages OpenCode lifecycle event handlers
 * 
 * This module sets up handlers for OpenCode lifecycle events:
 * - session.created - New session started (shows welcome toast)
 * - session.ended - Session terminated (future)
 * - message.sent - User sent a message (future)
 * 
 * Function: setupLifecycleHandlers()
 * - Creates event router
 * - Routes events to appropriate handlers
 * - Returns handler function for OpenCode
 * 
 * Lifecycle events allow plugins to:
 * - React to system state changes
 * - Provide user feedback
 * - Initialize/cleanup resources
 * - Track plugin activity
 */

export const setupLifecycleHandlers = (directory: string, client: any) => {
  return async ({ event }: { event: any }) => {
    // Route lifecycle events to appropriate handlers
    if (event.type === "session.created") {
      await handleSessionCreated(directory, client);
    }
    
    // Future: Add more lifecycle handlers here
    // if (event.type === "session.ended") { ... }
    // if (event.type === "message.sent") { ... }
  };
};

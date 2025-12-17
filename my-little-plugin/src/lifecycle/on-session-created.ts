import { getPluginName, getPluginVersion, getWelcomeMessage } from "../plugin-info";

/**
 * On Session Created Handler
 * 
 * Purpose: Handles the session.created lifecycle event
 * 
 * This function runs once when a new OpenCode session starts.
 * It provides user feedback by:
 * - Showing a welcome toast notification
 * - Displaying plugin version
 * - Informing users about log location
 * - Confirming the plugin is active and working
 * 
 * Function: handleSessionCreated()
 * - Triggered by: session.created event
 * - Shows: Success toast with version and log directory
 * - Fails gracefully: If TUI unavailable
 */

export const handleSessionCreated = async (
  directory: string,
  client: any
) => {
  const logDir = `${directory}/.tmp/my-little-plugin`;
  
  await client.tui
    .showToast({
      body: {
        title: `${getPluginName()} v${getPluginVersion()}`,
        message: getWelcomeMessage(logDir),
        variant: "success",
      },
    })
    .catch(() => {
      // Silently fail if toast cannot be shown
      // This prevents the plugin from crashing if TUI is unavailable
    });
};

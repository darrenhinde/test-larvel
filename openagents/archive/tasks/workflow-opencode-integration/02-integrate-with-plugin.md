# Task 02: Integrate with Plugin

**Estimated Time:** 30 minutes  
**Priority:** High  
**Status:** ⏳ Pending  
**Depends On:** Task 01

---

## 🎯 Objective

Integrate `OpenCodeAgentExecutor` with the OpenAgents plugin and register the `/workflow` command.

---

## 📋 Requirements

1. Import workflow components in plugin
2. Create `AgentResolver` with loaded agents
3. Create `WorkflowExecutor` with `OpenCodeAgentExecutor`
4. Register workflow command (`/workflow`)
5. Load and execute workflows from `.openagents/workflows/`
6. Handle errors and return user-friendly messages

---

## 🔨 Implementation

### Update: `src/plugin/index.ts`

```typescript
/**
 * OpenAgents Plugin
 * 
 * Main plugin that loads agents from .md files and registers them with OpenCode.
 * Now includes workflow orchestration support.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { readFileSync } from "node:fs"
import { loadAgents, type AgentDefinition, type OpenCodeAgentConfig } from "../agents"
import { loadConfig, type OpenAgentsConfig, type AgentConfig } from "./config"
import { createTaskTracker } from "../features/task-tracker"
import { createContextManager } from "../features/context"
import { createUIManager } from "../features/ui"

// Import workflow components
import { WorkflowExecutor, MaxErrorGuard, CircularDependencyGuard } from "../workflow/executor"
import { AgentStepExecutor, TransformStepExecutor, ConditionStepExecutor } from "../workflow/executors"
import { AgentResolver } from "../workflow/agent-resolver"
import { OpenCodeAgentExecutor } from "../workflow/opencode-agent-executor"
import type { WorkflowDefinition } from "../workflow/types"

const PLUGIN_NAME = "OpenAgents"
const PLUGIN_VERSION = "0.1.0"

// ... existing toOpenCodeAgent function ...

/**
 * OpenAgents Plugin
 */
const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Load config
  const config = loadConfig(directory)
  
  // Check if plugin is enabled
  if (!config.enabled) {
    console.log(`[${PLUGIN_NAME}] Plugin is disabled. Set "enabled": true in config to activate.`)
    return {
      config: async () => {}, // No-op
      event: async () => {}   // No-op
    }
  }
  
  // Create managers
  const taskTracker = createTaskTracker()
  const contextManager = createContextManager(directory)
  const uiManager = createUIManager(client)
  
  // ... existing agent loading code ...
  
  console.log(`[${PLUGIN_NAME}] Loaded ${agentMap.size} agents: ${agentNames.join(", ")}`)
  
  // ============================================================================
  // Workflow Setup
  // ============================================================================
  
  // Create agent resolver
  const resolver = new AgentResolver(agentMap, client)
  
  // Register OpenCode built-in agents
  const builtInAgents = ["plan", "build", "test", "review"]
  resolver.registerOpenCodeAgents(builtInAgents)
  
  console.log(`[${PLUGIN_NAME}] Agent resolver created with ${resolver.listAgentNames().length} total agents`)
  
  // Create workflow executor
  const agentExecutor = new OpenCodeAgentExecutor(client, resolver)
  const workflowExecutor = new WorkflowExecutor({
    uiManager,
    guards: [
      new MaxErrorGuard(10),
      new CircularDependencyGuard()
    ]
  })
  
  // Register step executors
  workflowExecutor.registerExecutor("agent", new AgentStepExecutor(agentExecutor))
  workflowExecutor.registerExecutor("transform", new TransformStepExecutor())
  workflowExecutor.registerExecutor("condition", new ConditionStepExecutor())
  
  console.log(`[${PLUGIN_NAME}] Workflow executor initialized`)
  
  return {
    /**
     * Register agents and commands with OpenCode
     */
    config: async (openCodeConfig) => {
      // ... existing agent registration code ...
      
      // ========================================================================
      // Register workflow command
      // ========================================================================
      
      openCodeConfig.command = {
        ...openCodeConfig.command,
        "workflow": {
          description: "Run a workflow",
          handler: async (args: string[]) => {
            try {
              const workflowName = args[0]
              
              if (!workflowName) {
                return "Usage: /workflow <workflow-name> [args...]\n\nExample: /workflow feature"
              }
              
              // Load workflow from .openagents/workflows/
              const workflowPath = join(directory, ".openagents/workflows", `${workflowName}.json`)
              
              let workflow: WorkflowDefinition
              try {
                const workflowContent = readFileSync(workflowPath, "utf-8")
                workflow = JSON.parse(workflowContent)
              } catch (error) {
                return `Error: Workflow '${workflowName}' not found at ${workflowPath}`
              }
              
              // Build input from remaining args
              const input = {
                task: args.slice(1).join(" ") || undefined,
                timestamp: new Date().toISOString()
              }
              
              console.log(`[${PLUGIN_NAME}] Executing workflow '${workflowName}'`)
              
              // Execute workflow
              const result = await workflowExecutor.execute(workflow, input)
              
              // Return result
              if (result.success) {
                return `✅ Workflow '${workflowName}' completed successfully\n\n` +
                       `Steps executed: ${result.context.metadata.iterationCount}\n` +
                       `Duration: ${Date.now() - result.context.startTime.getTime()}ms`
              } else {
                return `❌ Workflow '${workflowName}' failed\n\n` +
                       `Error: ${result.error?.message || "Unknown error"}\n` +
                       `Steps completed: ${result.context.metadata.iterationCount}`
              }
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error))
              console.error(`[${PLUGIN_NAME}] Workflow execution error:`, err)
              return `❌ Workflow execution failed: ${err.message}`
            }
          }
        }
      }
      
      console.log(`[${PLUGIN_NAME}] Registered workflow command`)
    },
    
    /**
     * Handle lifecycle events
     */
    event: async (input) => {
      // ... existing event handlers ...
    }
  }
}

console.log(`✅ ${PLUGIN_NAME} v${PLUGIN_VERSION} loaded`)

export default OpenAgentsPlugin
export { loadConfig, OpenAgentsConfigSchema } from "./config"
export type { OpenAgentsConfig, AgentConfig } from "./config"
```

---

## ✅ Acceptance Criteria

- [ ] Workflow components imported in plugin
- [ ] `AgentResolver` created with loaded agents
- [ ] OpenCode built-in agents registered with resolver
- [ ] `WorkflowExecutor` created with `OpenCodeAgentExecutor`
- [ ] Step executors registered (agent, transform, condition)
- [ ] `/workflow` command registered
- [ ] Command loads workflows from `.openagents/workflows/`
- [ ] Command executes workflows and returns results
- [ ] Error handling for missing workflows
- [ ] Error handling for execution failures
- [ ] User-friendly success/error messages

---

## 🧪 Testing

```bash
# 1. Start OpenCode with plugin
opencode

# 2. Test workflow command
/workflow feature

# Expected output:
# ✅ Workflow 'feature' completed successfully
# Steps executed: 3
# Duration: 5234ms

# 3. Test with missing workflow
/workflow nonexistent

# Expected output:
# Error: Workflow 'nonexistent' not found at ...

# 4. Test with args
/workflow feature "Build login system"

# Expected: Passes "Build login system" as input.task
```

---

## 📝 Notes

- Command format: `/workflow <name> [args...]`
- Workflows loaded from `.openagents/workflows/<name>.json`
- Additional args passed as `input.task`
- Success message shows steps executed and duration
- Error message shows error and steps completed
- Console logging for debugging

---

## 🔗 Related Files

- `src/workflow/opencode-agent-executor.ts` - Agent executor (from Task 01)
- `src/workflow/executor.ts` - Workflow executor
- `src/workflow/executors/agent.ts` - Agent step executor
- `src/workflow/agent-resolver.ts` - Agent resolver

---

## ⏭️ Next Task

After completing this task, proceed to:
- `03-create-example-workflows.md` - Create example workflow definitions

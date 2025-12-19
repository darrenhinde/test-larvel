# Task 02: Resolve Duplicate Entry Points

**Estimated Time:** 1 hour  
**Priority:** HIGH  
**Status:** ✅ Complete  
**Dependencies:** None  
**Completed:** December 18, 2024

---

## 🎯 Objective

Resolve the confusion caused by having two `index.ts` files at the root level by clarifying their purposes and ensuring a single, clear plugin entry point.

---

## 📋 Problem Statement

The codebase has two index files:

1. **`src/index.ts`** (126 lines) - Exports plugin and types
2. **`src/plugin/index.ts`** (307 lines) - Main plugin implementation

**Issues:**
- Unclear which is the actual entry point
- New developers get confused
- Potential for importing from wrong file
- Maintenance burden (which file to update?)

---

## 🔨 Implementation Steps

### Step 1: Analyze Current Files (15 min)

**Check `src/index.ts`:**
```bash
cat src/index.ts
```

**Check `src/plugin/index.ts`:**
```bash
cat src/plugin/index.ts
```

**Check `package.json`:**
```bash
cat package.json | grep -A 5 "main\|exports"
```

### Step 2: Determine Strategy (15 min)

**Option A: Keep `src/index.ts` as Public API**
- `src/index.ts` - Clean public API (exports only)
- `src/plugin/index.ts` - Implementation
- Best for library usage

**Option B: Use `src/plugin/index.ts` as Entry**
- Delete `src/index.ts`
- `src/plugin/index.ts` becomes main entry
- Update `package.json`
- Simpler structure

**Recommendation: Option A** (better for library consumers)

### Step 3: Implement Option A (30 min)

**Update `src/index.ts` to be clean public API:**

```typescript
/**
 * OpenAgents Plugin
 * 
 * A plugin for OpenCode that enables loading custom AI agents from markdown
 * files and orchestrating them via workflows.
 * 
 * @packageDocumentation
 */

// Main plugin export
export { default } from "./plugin"
export { default as OpenAgentsPlugin } from "./plugin"

// Configuration exports
export { 
  loadConfig, 
  OpenAgentsConfigSchema 
} from "./plugin/config"

export type { 
  OpenAgentsConfig, 
  AgentConfig 
} from "./plugin/config"

// Agent exports
export { 
  loadAgents, 
  loadAgentFromFile 
} from "./agents/loader"

export type { 
  AgentDefinition, 
  OpenCodeAgentConfig 
} from "./agents/types"

// Workflow exports
export { 
  WorkflowExecutor,
  MaxErrorGuard,
  CircularDependencyGuard 
} from "./workflow/executor"

export { 
  AgentStepExecutor,
  TransformStepExecutor,
  ConditionStepExecutor 
} from "./workflow/executors/agent"

export { 
  AgentResolver 
} from "./workflow/agent-resolver"

export { 
  OpenCodeAgentExecutor 
} from "./workflow/opencode-agent-executor"

export type { 
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  StepResult,
  AgentExecutor,
  UIManager,
  SafetyGuard
} from "./workflow/types"

// Feature exports
export { 
  createTaskTracker 
} from "./features/task-tracker"

export { 
  createContextManager 
} from "./features/context"

export { 
  createUIManager 
} from "./features/ui"

export type { 
  UIManager as UIManagerType 
} from "./features/ui"

// External types
export type {
  OpenCodeClient,
  SessionMessage,
  SessionStatus,
  TUIClient
} from "./workflow/external-types"
```

**Keep `src/plugin/index.ts` as implementation:**
- No changes needed
- This is the actual plugin code

### Step 4: Update Package.json (5 min)

```json
{
  "name": "openagents",
  "version": "0.1.0",
  "description": "OpenCode plugin for custom AI agents and workflows",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./plugin": {
      "import": "./dist/plugin/index.js",
      "require": "./dist/plugin/index.js",
      "types": "./dist/plugin/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

### Step 5: Add Documentation (10 min)

**Create `src/README.md`:**

```markdown
# OpenAgents Source Structure

## Entry Points

### `src/index.ts` - Public API
The main entry point for the package. Exports all public APIs for library consumers.

**Use this when:**
- Importing OpenAgents as a library
- Using workflow system programmatically
- Accessing types and utilities

**Example:**
\`\`\`typescript
import { WorkflowExecutor, AgentResolver } from "openagents"
\`\`\`

### `src/plugin/index.ts` - Plugin Implementation
The OpenCode plugin implementation. This is what OpenCode loads.

**Use this when:**
- Developing the plugin
- Understanding plugin initialization
- Debugging plugin behavior

**Example:**
\`\`\`typescript
// In opencode.config.ts
import OpenAgentsPlugin from "openagents/plugin"

export default {
  plugins: [OpenAgentsPlugin]
}
\`\`\`

## Module Structure

\`\`\`
src/
├── index.ts              ← Public API (re-exports)
├── plugin/               ← Plugin implementation
│   ├── index.ts         ← Main plugin code
│   └── config.ts        ← Configuration
├── agents/               ← Agent loading system
├── features/             ← Feature modules
└── workflow/             ← Workflow orchestration
\`\`\`

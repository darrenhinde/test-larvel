# OpenAgents Source Structure

This document explains the organization of the OpenAgents source code and clarifies the purpose of each entry point.

---

## 📁 Entry Points

### `src/index.ts` - Public API (Re-exports)

**Purpose:** Clean public API for library consumers.

This file **re-exports** all public APIs from the plugin implementation. It serves as the main entry point when importing OpenAgents as a library.

**Use this when:**
- ✅ Importing OpenAgents as a library
- ✅ Using the workflow system programmatically
- ✅ Accessing types and utilities
- ✅ Building custom integrations

**Example:**
```typescript
import { 
  WorkflowExecutor, 
  AgentResolver,
  OpenCodeAgentExecutor 
} from "openagents"

// Use workflow system programmatically
const executor = new WorkflowExecutor({ ... })
```

**What it exports:**
- Plugin (default export)
- Configuration utilities
- Agent loading system
- Workflow system (executors, guards, types)
- Feature modules (task tracker, context, UI)
- External type definitions

---

### `src/plugin/index.ts` - Plugin Implementation

**Purpose:** The actual OpenCode plugin implementation.

This file contains the **full plugin code** that OpenCode loads. It includes all the logic for:
- Loading agents from `.md` files
- Registering agents with OpenCode
- Setting up the workflow system
- Handling lifecycle events
- Managing UI notifications

**Use this when:**
- ✅ Developing the plugin itself
- ✅ Understanding plugin initialization
- ✅ Debugging plugin behavior
- ✅ Contributing to the plugin

**Example:**
```typescript
// In opencode.config.ts
import OpenAgentsPlugin from "openagents/plugin"

export default {
  plugins: [OpenAgentsPlugin]
}
```

**Note:** Most users should import from `"openagents"` (the public API), not `"openagents/plugin"`.

---

## 🗂️ Module Structure

```
src/
├── index.ts                    ← Public API (re-exports)
│
├── plugin/                     ← Plugin implementation
│   ├── index.ts               ← Main plugin code
│   └── config.ts              ← Configuration loading
│
├── agents/                     ← Agent loading system
│   ├── loader.ts              ← Load agents from .md files
│   └── types.ts               ← Agent type definitions
│
├── features/                   ← Feature modules
│   ├── task-tracker.ts        ← Track agent execution
│   ├── context.ts             ← Context management
│   ├── ui.ts                  ← UI notifications
│   └── visibility.ts          ← Visibility control
│
└── workflow/                   ← Workflow orchestration
    ├── executor.ts            ← Main workflow executor
    ├── agent-resolver.ts      ← Multi-source agent resolution
    ├── opencode-agent-executor.ts  ← OpenCode session execution
    ├── types.ts               ← Workflow type definitions
    ├── schema.ts              ← Zod schemas
    ├── validator.ts           ← Workflow validation
    ├── external-types.ts      ← OpenCode SDK types
    │
    ├── context/               ← Context management
    │   └── context.ts         ← Immutable context
    │
    └── executors/             ← Step executors
        ├── base.ts            ← Base executor with retry
        ├── agent.ts           ← Agent/Transform/Condition executors
        └── index.ts           ← Executor exports
```

---

## 🔄 Import Patterns

### For Plugin Users (Recommended)

```typescript
// Import from main package
import { WorkflowExecutor, AgentResolver } from "openagents"
import type { WorkflowDefinition, AgentExecutor } from "openagents"
```

### For OpenCode Configuration

```typescript
// Import plugin directly
import OpenAgentsPlugin from "openagents/plugin"

export default {
  plugins: [OpenAgentsPlugin]
}
```

### For Plugin Developers

```typescript
// Import from specific modules
import { loadAgents } from "./agents/loader"
import { WorkflowExecutor } from "./workflow/executor"
import { createUIManager } from "./features/ui"
```

---

## 📦 Package Exports

The `package.json` defines two export paths:

### 1. Main Export (`"openagents"`)
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

**Usage:**
```typescript
import { WorkflowExecutor } from "openagents"
```

### 2. Plugin Export (`"openagents/plugin"`)
```json
{
  "exports": {
    "./plugin": {
      "import": "./dist/plugin/index.js",
      "types": "./dist/plugin/index.d.ts"
    }
  }
}
```

**Usage:**
```typescript
import OpenAgentsPlugin from "openagents/plugin"
```

---

## 🎯 Design Principles

### 1. **Separation of Concerns**
- `src/index.ts` - Public API (what users import)
- `src/plugin/index.ts` - Implementation (what OpenCode loads)

### 2. **Clear Module Boundaries**
- Each module has a single responsibility
- Modules export clear interfaces
- Dependencies flow in one direction

### 3. **Type Safety**
- All public APIs are fully typed
- External dependencies have type definitions
- Type guards for runtime safety

### 4. **Extensibility**
- Plugin system for custom features
- Workflow system for orchestration
- Agent resolver for multi-source agents

---

## 🚀 Getting Started

### As a Plugin User

1. Install the package:
   ```bash
   npm install openagents
   ```

2. Import what you need:
   ```typescript
   import { WorkflowExecutor } from "openagents"
   ```

### As a Plugin Developer

1. Clone the repository
2. Install dependencies: `bun install`
3. Build: `bun run build`
4. Test: `bun test-workflow-integration.ts`

---

## 📚 Related Documentation

- [Workflow System](../docs/workflow/) - Workflow orchestration
- [Agent System](../docs/agents/) - Agent loading and management
- [Configuration](../CONFIGURATION.md) - Plugin configuration
- [Code Quality Roadmap](../CODE-QUALITY-ROADMAP.md) - Improvement tasks

---

## ❓ FAQ

### Q: Which file should I import from?
**A:** Import from `"openagents"` (the public API), not from internal modules.

### Q: What's the difference between `src/index.ts` and `src/plugin/index.ts`?
**A:** `src/index.ts` is a clean re-export file (public API), while `src/plugin/index.ts` is the actual plugin implementation.

### Q: Can I import from `"openagents/plugin"`?
**A:** Yes, but only for OpenCode configuration. For everything else, use `"openagents"`.

### Q: Why are there two entry points?
**A:** To separate the public API (for library users) from the plugin implementation (for OpenCode).

---

**Last Updated:** December 18, 2024

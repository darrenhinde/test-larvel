# OpenCode Plugin System - Complete Explanation

**Date**: Thu Dec 18 2025  
**Topic**: How OpenCode plugins work, configuration, and version management

---

## 🏗️ **OpenCode Plugin Architecture**

### **Directory Structure**

```
project/
├── .opencode/                    # OpenCode configuration directory
│   ├── opencode.json            # Plugin registration & OpenCode config
│   ├── package.json             # Plugin dependencies & versions
│   ├── bun.lock                 # Lock file for dependencies
│   └── node_modules/            # Installed plugins
│       └── openagents/          # Your plugin (if installed)
│
├── .openagents/                 # OpenAgents plugin configuration
│   ├── config.json              # OpenAgents settings
│   ├── agents/                  # Agent definitions
│   │   ├── researcher.md
│   │   ├── coder.md
│   │   └── reviewer.md
│   └── context/                 # Context files (auto-created)
│       ├── research-1.json
│       └── plan.json
│
└── openagents/                  # Plugin source (if developing locally)
    ├── src/
    ├── package.json
    └── ...
```

---

## 📋 **Configuration Layers**

### **Layer 1: OpenCode Configuration** (`.opencode/opencode.json`)

This file tells OpenCode **which plugins to load**.

```json
{
  "$schema": "https://opencode.ai/config.json",
  
  // Plugins to load
  "plugin": [
    "openagents",                    // NPM package name
    "file:///path/to/local/plugin"   // Local file path
  ],
  
  // OpenCode agent configuration
  "agent": {
    "explore": {
      "disable": true
    }
  }
}
```

**What it does**:
- ✅ Registers plugins with OpenCode
- ✅ Configures built-in OpenCode agents
- ✅ Loaded when OpenCode starts

---

### **Layer 2: Plugin Dependencies** (`.opencode/package.json`)

This file manages **plugin versions and dependencies**.

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "1.0.167",  // OpenCode plugin API version
    "openagents": "^0.1.0"              // Your plugin version
  }
}
```

**What it does**:
- ✅ Specifies plugin versions
- ✅ Manages dependencies
- ✅ Used by `bun install` to install plugins

---

### **Layer 3: Plugin Configuration** (`.openagents/config.json`)

This file configures **the plugin itself** (OpenAgents-specific settings).

```json
{
  "enabled": true,
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)",
  "default_visible_to": ["plan", "build"],
  "agents": {
    "researcher": {
      "enabled": true,
      "mode": "subagent",
      "temperature": 0.7
    }
  }
}
```

**What it does**:
- ✅ Configures plugin behavior
- ✅ Configures agents
- ✅ Loaded by the plugin at runtime

---

## 🔄 **How Configuration is Loaded**

### **Step-by-Step Flow**

```
1. User runs: opencode
   ↓
2. OpenCode reads: .opencode/opencode.json
   ↓
3. OpenCode sees: "plugin": ["openagents"]
   ↓
4. OpenCode checks: .opencode/node_modules/openagents/
   ↓
5. OpenCode loads: openagents plugin
   ↓
6. Plugin reads: .openagents/config.json
   ↓
7. Plugin loads agents from: .openagents/agents/*.md
   ↓
8. Plugin registers agents with OpenCode
   ↓
9. ✅ Ready!
```

---

## 📦 **Plugin Installation Methods**

### **Method 1: NPM Package** (Production)

**Install from NPM**:
```bash
cd .opencode
bun add openagents
```

**Result**:
```json
// .opencode/package.json
{
  "dependencies": {
    "openagents": "^0.1.0"
  }
}
```

**Register in OpenCode**:
```json
// .opencode/opencode.json
{
  "plugin": ["openagents"]
}
```

**Benefits**:
- ✅ Easy to install
- ✅ Version management via package.json
- ✅ Automatic updates with `bun update`

---

### **Method 2: Local File Path** (Development)

**Link local plugin**:
```json
// .opencode/opencode.json
{
  "plugin": [
    "file:///Users/you/projects/openagents"
  ]
}
```

**Benefits**:
- ✅ Live development (changes reflected immediately)
- ✅ No need to publish to NPM
- ✅ Good for testing

**Drawbacks**:
- ❌ Absolute path (not portable)
- ❌ Must exist on filesystem

---

### **Method 3: Bun Link** (Development)

**In plugin directory**:
```bash
cd /path/to/openagents
bun link
```

**In project directory**:
```bash
cd /path/to/project/.opencode
bun link openagents
```

**Result**:
```json
// .opencode/package.json
{
  "dependencies": {
    "openagents": "link:openagents"
  }
}
```

**Register in OpenCode**:
```json
// .opencode/opencode.json
{
  "plugin": ["openagents"]
}
```

**Benefits**:
- ✅ Symlink (changes reflected immediately)
- ✅ Works like NPM package
- ✅ Portable (uses package name)

---

## 🔄 **Version Management**

### **Problem: Always Get Latest Version**

**Current Behavior**:
```json
// .opencode/package.json
{
  "dependencies": {
    "openagents": "^0.1.0"  // Caret allows minor updates
  }
}
```

**What `^0.1.0` means**:
- ✅ Allows: `0.1.1`, `0.1.2`, `0.1.x`
- ❌ Blocks: `0.2.0`, `1.0.0`

---

### **Solution 1: Use `latest` Tag** (Recommended)

```json
// .opencode/package.json
{
  "dependencies": {
    "openagents": "latest"
  }
}
```

**Update to latest**:
```bash
cd .opencode
bun update openagents
```

**Benefits**:
- ✅ Always gets latest version
- ✅ Explicit update command
- ✅ Safe (you control when to update)

---

### **Solution 2: Use Wildcard**

```json
// .opencode/package.json
{
  "dependencies": {
    "openagents": "*"
  }
}
```

**Benefits**:
- ✅ Always gets latest version
- ❌ Dangerous (auto-updates can break things)

---

### **Solution 3: Auto-Update Script**

Create a script to auto-update:

```bash
#!/bin/bash
# .opencode/update-plugins.sh

cd .opencode
bun update openagents
echo "✅ OpenAgents updated to latest version"
```

**Run before starting OpenCode**:
```bash
./.opencode/update-plugins.sh && opencode
```

---

### **Solution 4: Version Check in Plugin** (Best)

Add version checking to the plugin itself:

```typescript
// In src/plugin/index.ts

const PLUGIN_VERSION = "0.1.0"
const LATEST_VERSION_URL = "https://registry.npmjs.org/openagents/latest"

async function checkForUpdates() {
  try {
    const response = await fetch(LATEST_VERSION_URL)
    const data = await response.json()
    const latestVersion = data.version
    
    if (latestVersion !== PLUGIN_VERSION) {
      console.warn(`
⚠️  OpenAgents Update Available!
   Current: v${PLUGIN_VERSION}
   Latest:  v${latestVersion}
   
   Update with: cd .opencode && bun update openagents
      `)
    }
  } catch (error) {
    // Silently fail
  }
}

// Call on plugin load
checkForUpdates()
```

**Benefits**:
- ✅ Automatic notification
- ✅ User controls when to update
- ✅ Non-intrusive

---

## 🎯 **Recommended Setup**

### **For Development**

```bash
# 1. Link plugin for development
cd /path/to/openagents
bun link

# 2. Link in project
cd /path/to/project/.opencode
bun link openagents

# 3. Register plugin
# Edit .opencode/opencode.json:
{
  "plugin": ["openagents"]
}

# 4. Configure plugin
# Edit .openagents/config.json:
{
  "enabled": true,
  "default_visible_to": ["plan", "build"]
}
```

---

### **For Production**

```bash
# 1. Install from NPM
cd .opencode
bun add openagents

# 2. Register plugin
# Edit .opencode/opencode.json:
{
  "plugin": ["openagents"]
}

# 3. Configure plugin
# Edit .openagents/config.json:
{
  "enabled": true,
  "default_visible_to": ["plan", "build"]
}

# 4. Update regularly
cd .opencode
bun update openagents
```

---

## 📊 **Configuration Priority**

### **How Settings are Merged**

```
1. Plugin Defaults (in code)
   ↓
2. .openagents/config.json (plugin config)
   ↓
3. Agent .md frontmatter (per-agent)
   ↓
4. .openagents/config.json agents section (per-agent overrides)
```

**Example**:

```typescript
// 1. Plugin Default
default_model: "opencode/big-pickle"

// 2. Plugin Config
// .openagents/config.json
{
  "default_model": "opencode/grok-fast"  // Overrides default
}

// 3. Agent Frontmatter
// .openagents/agents/researcher.md
---
model: "opencode/big-pickle"  // Overrides plugin config
---

// 4. Agent Config Override
// .openagents/config.json
{
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast"  // Overrides frontmatter
    }
  }
}

// Final result: "opencode/grok-fast"
```

---

## 🔍 **How OpenCode Finds Plugins**

### **Search Order**

```
1. Check .opencode/node_modules/[plugin-name]/
   ↓
2. Check node_modules/[plugin-name]/ (project root)
   ↓
3. Check global node_modules (if installed globally)
   ↓
4. If file:// path, load directly from filesystem
```

---

## 🛠️ **Plugin Development Workflow**

### **Step 1: Create Plugin**

```bash
mkdir openagents
cd openagents
bun init
```

### **Step 2: Add Plugin Entry Point**

```typescript
// src/index.ts
import type { Plugin } from "@opencode-ai/plugin"

const OpenAgentsPlugin: Plugin = async (ctx) => {
  const { directory, client } = ctx
  
  // Load config from .openagents/config.json
  const config = loadConfig(directory)
  
  return {
    config: async (openCodeConfig) => {
      // Register agents
    },
    event: async (input) => {
      // Handle events
    }
  }
}

export default OpenAgentsPlugin
```

### **Step 3: Link for Development**

```bash
# In plugin directory
bun link

# In project directory
cd .opencode
bun link openagents
```

### **Step 4: Test**

```bash
opencode --print-logs
```

### **Step 5: Publish**

```bash
# Bump version
npm version patch

# Publish to NPM
npm publish
```

---

## 📝 **Complete Example**

### **Project Structure**

```
my-project/
├── .opencode/
│   ├── opencode.json
│   ├── package.json
│   └── node_modules/
│       └── openagents/
│
└── .openagents/
    ├── config.json
    └── agents/
        ├── researcher.md
        └── coder.md
```

### **1. Register Plugin**

```json
// .opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["openagents"]
}
```

### **2. Install Plugin**

```bash
cd .opencode
bun add openagents
```

### **3. Configure Plugin**

```json
// .openagents/config.json
{
  "enabled": true,
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)",
  "default_visible_to": ["plan", "build"],
  "agents": {
    "researcher": {
      "enabled": true,
      "mode": "subagent",
      "temperature": 0.7
    }
  }
}
```

### **4. Create Agents**

```markdown
<!-- .openagents/agents/researcher.md -->
---
description: "Research agent"
mode: "subagent"
temperature: 0.7
---

You are a research agent...
```

### **5. Start OpenCode**

```bash
opencode
```

### **6. Verify**

```
✅ Toast appears: "OpenAgents v0.1.0 - Active with 1 agent"
✅ Agent shows as: "(OpenSub) researcher"
✅ Only visible to: plan, build
```

---

## 🔄 **Update Workflow**

### **Check for Updates**

```bash
cd .opencode
bun outdated
```

### **Update Plugin**

```bash
cd .opencode
bun update openagents
```

### **Verify Version**

```bash
cd .opencode
cat package.json | grep openagents
```

---

## 🎯 **Best Practices**

### **1. Version Management**

```json
// .opencode/package.json
{
  "dependencies": {
    "openagents": "^0.1.0"  // Allow patch updates
  }
}
```

### **2. Configuration**

```json
// .openagents/config.json
{
  "enabled": true,  // Explicit opt-in
  "default_visible_to": ["plan", "build"]  // Restrict visibility
}
```

### **3. Agent Organization**

```
.openagents/
├── agents/
│   ├── research/
│   │   ├── researcher.md
│   │   └── analyst.md
│   └── code/
│       ├── coder.md
│       └── reviewer.md
└── config.json
```

### **4. Documentation**

```json
// .openagents/config.json
{
  // Enable the plugin
  "enabled": true,
  
  // Prefix settings
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)",
  
  // Visibility: only plan and build can see subagents
  "default_visible_to": ["plan", "build"]
}
```

---

## 🚀 **Quick Reference**

### **Install Plugin**
```bash
cd .opencode && bun add openagents
```

### **Update Plugin**
```bash
cd .opencode && bun update openagents
```

### **Link for Development**
```bash
cd /path/to/openagents && bun link
cd /path/to/project/.opencode && bun link openagents
```

### **Check Version**
```bash
cd .opencode && cat package.json | grep openagents
```

### **Enable Plugin**
```json
// .opencode/opencode.json
{ "plugin": ["openagents"] }
```

### **Configure Plugin**
```json
// .openagents/config.json
{ "enabled": true }
```

---

## ✅ **Summary**

### **Configuration Files**

| File | Purpose | Loaded By |
|------|---------|-----------|
| `.opencode/opencode.json` | Register plugins | OpenCode |
| `.opencode/package.json` | Plugin versions | Bun/NPM |
| `.openagents/config.json` | Plugin settings | OpenAgents Plugin |
| `.openagents/agents/*.md` | Agent definitions | OpenAgents Plugin |

### **Version Management**

| Method | Command | Auto-Update |
|--------|---------|-------------|
| NPM Package | `bun add openagents` | No |
| Latest Tag | `bun add openagents@latest` | No |
| Wildcard | `"openagents": "*"` | Yes (dangerous) |
| Bun Link | `bun link openagents` | Yes (dev only) |

### **Configuration Priority**

```
Plugin Defaults < Plugin Config < Agent Frontmatter < Agent Config Override
```

---

**Now you understand the complete OpenCode plugin system!** 🎉

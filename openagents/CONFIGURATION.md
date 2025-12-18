# OpenAgents Configuration Guide

Complete reference for configuring OpenAgents.

---

## 🚀 **Quick Start**

### **Minimal Configuration**

```json
{
  "enabled": true
}
```

That's it! This enables the plugin with all defaults.

---

## 📁 **Configuration Files**

### **File Locations**

OpenAgents looks for configuration in these locations (first found wins):

1. `.openagents/config.json` ⭐ **Recommended**
2. `.openagents.json`
3. `openagents.json`

### **OpenCode Plugin Registration**

Register the plugin in `.opencode/opencode.json`:

```json
{
  "plugin": ["openagents"]
}
```

---

## 📋 **Configuration Schema**

### **Top-Level Options**

```json
{
  // Enable/disable the plugin (OPT-IN by default)
  "enabled": false,
  
  // Directory containing agent .md files
  "agents_dir": "./agents",
  
  // Default model for all agents
  "default_model": "opencode/big-pickle",
  
  // Directory for context files
  "context_dir": "./.openagents/context",
  
  // Add prefixes to agent names
  "add_prefix": true,
  
  // Prefix for primary agents (mode: "primary")
  "primary_prefix": "(Open)",
  
  // Prefix for subagents (mode: "subagent")
  "subagent_prefix": "(OpenSub)",
  
  // Default visibility (which agents can see subagents)
  "default_visible_to": ["plan", "build"],
  
  // Show version popup on session start
  "show_version_popup": true,
  
  // Per-agent configuration
  "agents": { ... },
  
  // Disabled agents (by name)
  "disabled_agents": []
}
```

---

## 🤖 **Per-Agent Configuration**

### **Agent Options**

```json
{
  "agents": {
    "agent-name": {
      // Path to agent .md file (optional)
      "file": "./custom/path/agent.md",
      
      // Model to use
      "model": "opencode/grok-fast",
      
      // Agent mode
      "mode": "subagent",  // or "primary"
      
      // Enable/disable agent
      "enabled": true,
      
      // Suitable for parallel execution
      "parallel": true,
      "parallel_limit": 10,
      
      // Temperature (0-2)
      "temperature": 0.7,
      
      // Max output tokens
      "maxTokens": 4096,
      
      // Description override
      "description": "Custom description",
      
      // Tool overrides
      "tools": {
        "write": true,
        "edit": true,
        "bash": false
      },
      
      // Disabled tools
      "disabled_tools": ["write", "edit"],
      
      // Visibility control
      "visible_to": ["plan", "build"],
      
      // Custom prefix (overrides primary_prefix/subagent_prefix)
      "prefix": "(Custom)"
    }
  }
}
```

---

## 🎨 **Prefix System**

### **How Prefixes Work**

OpenAgents adds prefixes to agent names to identify them:

```
Primary Agents (mode: "primary"):
- (Open) custom-plan
- (Open) custom-build

Subagents (mode: "subagent"):
- (OpenSub) researcher
- (OpenSub) coder
- (OpenSub) reviewer
```

### **Configuration**

```json
{
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)"
}
```

### **Per-Agent Custom Prefix**

```json
{
  "agents": {
    "researcher": {
      "prefix": "(Research)"  // Overrides subagent_prefix
    }
  }
}
```

**Result**: `(Research) researcher`

### **Disable Prefixes**

```json
{
  "add_prefix": false
}
```

**Result**: Agents show without prefixes

---

## 👁️ **Visibility Controls**

### **Default Visibility**

Control which agents can see OpenAgents subagents:

```json
{
  "default_visible_to": ["plan", "build"]
}
```

**Result**:
- `plan` agent can see all subagents
- `build` agent can see all subagents
- Other agents cannot see subagents

### **Per-Agent Visibility**

```json
{
  "agents": {
    "researcher": {
      "visible_to": ["*"]  // Visible to all
    },
    "coder": {
      "visible_to": ["plan", "build"]  // Only plan & build
    },
    "reviewer": {
      "visible_to": ["build"]  // Only build
    }
  }
}
```

### **Visibility Options**

| Value | Meaning |
|-------|---------|
| `["*"]` | Visible to all agents |
| `["plan", "build"]` | Only visible to plan and build |
| `["plan"]` | Only visible to plan |
| `[]` | Not visible to any agent (effectively disabled) |

---

## 📚 **Configuration Examples**

### **Example 1: Minimal (Recommended)**

```json
{
  "enabled": true
}
```

**Result**:
- Plugin enabled
- All defaults applied
- Subagents visible to plan & build only
- Prefixes enabled: `(OpenSub) agent-name`

---

### **Example 2: Custom Prefixes**

```json
{
  "enabled": true,
  "primary_prefix": "(MyApp)",
  "subagent_prefix": "(Agent)"
}
```

**Result**:
- Primary agents: `(MyApp) agent-name`
- Subagents: `(Agent) agent-name`

---

### **Example 3: Open Visibility**

```json
{
  "enabled": true,
  "default_visible_to": ["*"]
}
```

**Result**:
- All agents can see all subagents
- Good for small projects

---

### **Example 4: Restricted Visibility**

```json
{
  "enabled": true,
  "default_visible_to": ["plan"],
  "agents": {
    "researcher": {
      "visible_to": ["plan", "research"]
    },
    "coder": {
      "visible_to": ["build", "dev"]
    }
  }
}
```

**Result**:
- Most agents only visible to `plan`
- `researcher` visible to `plan` and `research`
- `coder` visible to `build` and `dev`

---

### **Example 5: Mixed Configuration**

```json
{
  "enabled": true,
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)",
  "default_visible_to": ["plan", "build"],
  "default_model": "opencode/big-pickle",
  "agents": {
    "researcher": {
      "enabled": true,
      "mode": "subagent",
      "model": "opencode/grok-fast",
      "parallel": true,
      "temperature": 0.7,
      "visible_to": ["*"]
    },
    "coder": {
      "enabled": true,
      "mode": "subagent",
      "parallel": false,
      "temperature": 0.2,
      "visible_to": ["plan", "build"]
    },
    "reviewer": {
      "enabled": true,
      "mode": "subagent",
      "tools": {
        "write": false,
        "edit": false
      },
      "visible_to": ["build"]
    }
  }
}
```

---

## 🎯 **Use Cases**

### **Use Case 1: Small Project**

```json
{
  "enabled": true,
  "default_visible_to": ["*"]
}
```

**When to use**:
- Small team
- Few agents
- Simple workflows

---

### **Use Case 2: Large Project**

```json
{
  "enabled": true,
  "default_visible_to": ["plan", "build"],
  "agents": {
    "researcher": {
      "visible_to": ["plan", "research"]
    },
    "coder": {
      "visible_to": ["build", "dev"]
    },
    "reviewer": {
      "visible_to": ["build"]
    }
  }
}
```

**When to use**:
- Large team
- Many agents
- Need to control context bloat

---

### **Use Case 3: Development**

```json
{
  "enabled": true,
  "show_version_popup": true,
  "default_visible_to": ["*"]
}
```

**When to use**:
- Testing agents
- Development mode
- Want to see all agents

---

### **Use Case 4: Production**

```json
{
  "enabled": true,
  "show_version_popup": false,
  "default_visible_to": ["plan", "build"],
  "agents": {
    "researcher": {
      "enabled": true,
      "visible_to": ["plan"]
    }
  }
}
```

**When to use**:
- Production environment
- Want minimal noise
- Strict visibility control

---

## 🔧 **Configuration Priority**

Settings are merged in this order (later overrides earlier):

```
1. Plugin Defaults (in code)
   ↓
2. .openagents/config.json (top-level)
   ↓
3. Agent .md frontmatter
   ↓
4. .openagents/config.json (agents section)
```

### **Example**

```typescript
// 1. Plugin Default
default_model: "opencode/big-pickle"

// 2. Config File (top-level)
{
  "default_model": "opencode/grok-fast"  // Overrides default
}

// 3. Agent Frontmatter
---
model: "opencode/big-pickle"  // Overrides config
---

// 4. Agent Config Override
{
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast"  // Overrides frontmatter
    }
  }
}

// Final: "opencode/grok-fast"
```

---

## ⚙️ **Agent Frontmatter**

Agents can define defaults in their `.md` files:

```markdown
---
description: "Research agent"
model: "opencode/grok-fast"
mode: "subagent"
temperature: 0.7
maxTokens: 4096
disabledTools: ["write", "edit"]
color: "#00CED1"
---

Your agent prompt goes here...
```

These can be overridden in `config.json`:

```json
{
  "agents": {
    "researcher": {
      "model": "opencode/big-pickle",  // Overrides frontmatter
      "temperature": 0.5               // Overrides frontmatter
    }
  }
}
```

---

## 🚨 **Common Mistakes**

### **1. Forgetting to Enable**

```json
// ❌ Plugin won't work
{
  "agents": { ... }
}

// ✅ Plugin enabled
{
  "enabled": true,
  "agents": { ... }
}
```

### **2. Wrong Visibility Syntax**

```json
// ❌ Wrong
{
  "default_visible_to": "*"
}

// ✅ Correct
{
  "default_visible_to": ["*"]
}
```

### **3. Conflicting Settings**

```json
// ❌ Confusing
{
  "add_prefix": false,
  "primary_prefix": "(Open)"  // Won't be used
}

// ✅ Clear
{
  "add_prefix": true,
  "primary_prefix": "(Open)"
}
```

---

## 📖 **Related Documentation**

- [README.md](./README.md) - Project overview
- [PLUGIN-SYSTEM-EXPLAINED.md](./PLUGIN-SYSTEM-EXPLAINED.md) - Plugin system guide
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [.openagents/config.example.json](./.openagents/config.example.json) - Full example

---

## 🆘 **Need Help?**

- Check [.openagents/config.example.json](./.openagents/config.example.json) for a complete example
- See [PLUGIN-SYSTEM-EXPLAINED.md](./PLUGIN-SYSTEM-EXPLAINED.md) for how the plugin system works
- Review examples above for common use cases

---

**Last Updated**: Dec 18, 2025

# OpenAgents v1 - Configuration Reference

**Last Updated**: Thu Dec 18 2025

---

## 🎯 Configuration Philosophy

**Simple by default, powerful when needed.**

Most users need just 2-3 lines of config. Power users can customize everything.

---

## 📝 Minimal Configuration

### **Example 1: Use Defaults**

```json
{}
```

**Result**:
- Loads agents from `.openagents/agents/`
- Uses `opencode/big-pickle` for all agents
- Context saved to `.openagents/context/`

### **Example 2: Custom Model**

```json
{
  "default_model": "opencode/grok-fast"
}
```

### **Example 3: Per-Agent Config**

```json
{
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true
    }
  }
}
```

---

## 📋 Full Configuration Schema

```typescript
{
  // Directory containing agent .md files
  "agents_dir": string = "./agents"
  
  // Default model for all agents
  "default_model": string = "opencode/big-pickle"
  
  // Directory for context files
  "context_dir": string = "./.openagents/context"
  
  // Agents to disable (by name)
  "disabled_agents": string[] = []
  
  // Per-agent configuration
  "agents": {
    "[agent-name]": {
      // Enable/disable agent
      "enabled": boolean = true
      
      // Model to use
      "model": string = default_model
      
      // Agent mode
      "mode": "primary" | "subagent" = "subagent"
      
      // Suitable for parallel execution
      "parallel": boolean = false
      
      // Max parallel instances
      "parallel_limit": number = 10
      
      // Temperature (0-2)
      "temperature": number
      
      // Max output tokens
      "max_tokens": number
      
      // Tool overrides
      "tools": {
        "[tool-name]": boolean
      }
      
      // Disabled tools
      "disabled_tools": string[]
      
      // UI color
      "color": string
    }
  }
}
```

---

## 🎨 Configuration Examples

### **Example 1: Research Team**

```json
{
  "default_model": "opencode/grok-fast",
  "agents": {
    "researcher-fast": {
      "parallel": true,
      "parallel_limit": 10,
      "temperature": 0.7
    },
    "researcher-deep": {
      "model": "opencode/big-pickle",
      "parallel": false,
      "temperature": 0.5
    },
    "synthesizer": {
      "model": "opencode/big-pickle",
      "parallel": false,
      "temperature": 0.3
    }
  }
}
```

**Use Case**: Fast parallel research, then deep analysis, then synthesis

### **Example 2: Code Team**

```json
{
  "default_model": "opencode/big-pickle",
  "agents": {
    "coder": {
      "temperature": 0.2,
      "parallel": false
    },
    "reviewer": {
      "temperature": 0.3,
      "parallel": false,
      "tools": {
        "write": false,
        "edit": false
      }
    },
    "tester": {
      "temperature": 0.4,
      "parallel": false
    }
  }
}
```

**Use Case**: Sequential code → review → test workflow

### **Example 3: Mixed Team**

```json
{
  "default_model": "opencode/big-pickle",
  "agents": {
    "explorer": {
      "model": "opencode/grok-fast",
      "parallel": true,
      "parallel_limit": 5,
      "temperature": 0.8
    },
    "analyzer": {
      "parallel": false,
      "temperature": 0.3
    },
    "documenter": {
      "parallel": false,
      "temperature": 0.5,
      "tools": {
        "bash": false
      }
    }
  }
}
```

**Use Case**: Explore in parallel, analyze sequentially, document

---

## 🔧 Configuration Loading

### **File Locations** (first found wins):

1. `.openagents/config.json`
2. `.openagents.json`
3. `openagents.json`

### **Example Directory Structure**:

```
project/
├── .openagents/
│   ├── config.json          # ← Configuration
│   ├── agents/              # ← Agent definitions
│   │   ├── researcher.md
│   │   ├── coder.md
│   │   └── reviewer.md
│   └── context/             # ← Context files (auto-created)
│       ├── research-1.json
│       └── plan.json
└── ...
```

---

## 📊 Configuration Validation

### **Valid Models** (v1):
- `opencode/big-pickle` (default, more capable)
- `opencode/grok-fast` (faster, good for parallel)

### **Valid Modes**:
- `subagent` (default) - Invoked by other agents
- `primary` - Can be main agent

### **Valid Temperature**:
- Range: `0.0` to `2.0`
- Lower = more focused
- Higher = more creative

### **Valid Parallel Limit**:
- Range: `1` to `20`
- Recommended: `5-10` for most use cases

---

## ⚙️ Agent Definition (`.md` files)

### **Frontmatter Fields**:

```markdown
---
description: "Short description"
model: "opencode/grok-fast"
mode: "subagent"
temperature: 0.7
maxTokens: 4096
disabledTools: ["write", "edit"]
color: "#00CED1"
---

Your agent prompt goes here...
```

### **Config Override Priority**:

1. **Config file** (`config.json`) - Highest priority
2. **Agent file** (`.md` frontmatter) - Medium priority
3. **Defaults** - Lowest priority

**Example**:
```json
// config.json
{
  "default_model": "opencode/big-pickle",
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast"  // ← Overrides frontmatter
    }
  }
}
```

```markdown
<!-- researcher.md -->
---
model: "opencode/big-pickle"  # ← Overridden by config.json
temperature: 0.7              # ← Used (not in config.json)
---
```

**Result**: Uses `opencode/grok-fast` with `temperature: 0.7`

---

## 🎯 Best Practices

### **1. Start Simple**
```json
{
  "agents": {
    "researcher": { "parallel": true }
  }
}
```

### **2. Use Defaults**
Don't specify what you don't need to change:
```json
// ❌ Too verbose
{
  "agents_dir": "./agents",
  "default_model": "opencode/big-pickle",
  "context_dir": "./.openagents/context",
  "agents": {
    "researcher": {
      "enabled": true,
      "mode": "subagent",
      "parallel": false
    }
  }
}

// ✅ Clean
{
  "agents": {
    "researcher": { "parallel": true }
  }
}
```

### **3. Group by Purpose**
```json
{
  "agents": {
    // Research team (parallel, fast)
    "researcher-1": { "model": "opencode/grok-fast", "parallel": true },
    "researcher-2": { "model": "opencode/grok-fast", "parallel": true },
    
    // Analysis team (sequential, thorough)
    "analyzer": { "model": "opencode/big-pickle" },
    "synthesizer": { "model": "opencode/big-pickle" }
  }
}
```

### **4. Document Your Config**
```json
{
  "agents": {
    "researcher": {
      // Fast model for parallel research
      "model": "opencode/grok-fast",
      "parallel": true,
      "parallel_limit": 10,
      
      // Higher temp for creative exploration
      "temperature": 0.8
    }
  }
}
```

---

## 🚨 Common Mistakes

### **1. Over-Configuration**
```json
// ❌ Don't do this
{
  "agents": {
    "researcher": {
      "enabled": true,
      "model": "opencode/big-pickle",
      "mode": "subagent",
      "parallel": false,
      "parallel_limit": 10,
      "temperature": 0.7,
      "max_tokens": 4096
    }
  }
}

// ✅ Do this (only what you need)
{
  "agents": {
    "researcher": {
      "temperature": 0.7
    }
  }
}
```

### **2. Wrong Model Names**
```json
// ❌ Wrong
{ "default_model": "gpt-4" }

// ✅ Correct
{ "default_model": "opencode/big-pickle" }
```

### **3. Invalid Temperature**
```json
// ❌ Out of range
{ "agents": { "researcher": { "temperature": 3.0 } } }

// ✅ Valid range
{ "agents": { "researcher": { "temperature": 0.7 } } }
```

---

## 📚 Quick Reference

### **Minimal Configs**:

```json
// Use all defaults
{}

// Custom default model
{ "default_model": "opencode/grok-fast" }

// Enable parallel for one agent
{ "agents": { "researcher": { "parallel": true } } }

// Disable tools for one agent
{ "agents": { "reviewer": { "tools": { "write": false } } } }
```

### **Common Patterns**:

```json
// Fast parallel research
{
  "agents": {
    "researcher": {
      "model": "opencode/grok-fast",
      "parallel": true,
      "temperature": 0.8
    }
  }
}

// Careful sequential coding
{
  "agents": {
    "coder": {
      "model": "opencode/big-pickle",
      "parallel": false,
      "temperature": 0.2
    }
  }
}

// Read-only reviewer
{
  "agents": {
    "reviewer": {
      "tools": {
        "write": false,
        "edit": false,
        "bash": false
      }
    }
  }
}
```

---

**That's it! Keep it simple, use defaults, configure only what you need.**

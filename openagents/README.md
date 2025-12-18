# OpenAgents

**A simple, powerful plugin for creating and managing AI agents in [OpenCode](https://opencode.ai).**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

---

## 🎯 **What is OpenAgents?**

OpenAgents makes it easy to create, share, and use specialized AI agents. Each agent is just a markdown file with a prompt - no complex code required.

### **Key Features**

- ✅ **Simple**: Agents are `.md` files with optional frontmatter
- ✅ **Modular**: Each agent has a specific purpose
- ✅ **Configurable**: Fine-grained control via `config.json`
- ✅ **Visible**: Agents show with `(OpenSub)` prefix
- ✅ **Controlled**: Visibility controls prevent context bloat
- ✅ **Tracked**: Automatic task and context tracking

---

## 🚀 **Quick Start**

### **1. Install**

```bash
cd .opencode
bun add openagents
```

### **2. Register Plugin**

Add to `.opencode/opencode.json`:

```json
{
  "plugin": ["openagents"]
}
```

### **3. Enable Plugin**

Create `.openagents/config.json`:

```json
{
  "enabled": true
}
```

### **4. Create an Agent**

Create `.openagents/agents/researcher.md`:

```markdown
---
description: "Research agent for exploring codebases"
mode: "subagent"
temperature: 0.7
---

You are a research agent specialized in exploring codebases and finding information.

## Your Mission

Help users understand code by:
- Finding relevant files and functions
- Explaining code patterns
- Identifying dependencies
```

### **5. Start OpenCode**

```bash
opencode
```

You'll see a popup: **"OpenAgents v0.1.0 - Active with 1 agent"**

Your agent will appear as: **`(OpenSub) researcher`**

---

## 📚 **Documentation**

- **[CONFIGURATION.md](./CONFIGURATION.md)** - Complete configuration guide
- **[PLUGIN-SYSTEM-EXPLAINED.md](./PLUGIN-SYSTEM-EXPLAINED.md)** - How the plugin system works
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history
- **[.openagents/config.example.json](./.openagents/config.example.json)** - Full config example

---

## 🤖 **Agent Format**

Agents are markdown files with optional YAML frontmatter:

```markdown
---
description: "What this agent does"
mode: "subagent"
model: "opencode/big-pickle"
temperature: 0.7
---

Your agent prompt goes here...
```

### **Frontmatter Fields**

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Short description |
| `mode` | `"primary"` \| `"subagent"` | Agent mode |
| `model` | string | Model to use |
| `temperature` | number | Temperature (0-2) |
| `maxTokens` | number | Max output tokens |
| `disabledTools` | string[] | Tools to disable |

**See [CONFIGURATION.md](./CONFIGURATION.md) for all options.**

---

## ⚙️ **Configuration**

### **Minimal Configuration**

```json
{
  "enabled": true
}
```

### **Recommended Configuration**

```json
{
  "enabled": true,
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)",
  "default_visible_to": ["plan", "build"]
}
```

### **Per-Agent Configuration**

```json
{
  "enabled": true,
  "agents": {
    "researcher": {
      "mode": "subagent",
      "temperature": 0.7,
      "visible_to": ["plan", "research"]
    },
    "coder": {
      "mode": "subagent",
      "temperature": 0.2,
      "visible_to": ["build", "dev"]
    }
  }
}
```

**See [CONFIGURATION.md](./CONFIGURATION.md) for complete reference.**

---

## 🎨 **Prefix System**

OpenAgents adds prefixes to identify agents:

```
Primary Agents:
- (Open) custom-plan
- (Open) custom-build

Subagents:
- (OpenSub) researcher
- (OpenSub) coder
- (OpenSub) reviewer
```

**Configure**:
```json
{
  "add_prefix": true,
  "primary_prefix": "(Open)",
  "subagent_prefix": "(OpenSub)"
}
```

**Disable**:
```json
{
  "add_prefix": false
}
```

---

## 👁️ **Visibility Controls**

Control which agents can see your subagents:

```json
{
  "default_visible_to": ["plan", "build"]
}
```

**Result**: Only `plan` and `build` agents can see subagents.

**Per-Agent**:
```json
{
  "agents": {
    "researcher": {
      "visible_to": ["*"]  // Visible to all
    },
    "coder": {
      "visible_to": ["build"]  // Only build
    }
  }
}
```

**See [CONFIGURATION.md](./CONFIGURATION.md) for details.**

---

## 📦 **Built-in Agents**

OpenAgents includes example agents:

### **researcher**
Research and exploration agent.

### **coder**
Code implementation agent.

### **reviewer**
Code review agent.

**Location**: `.openagents/agents/`

---

## 🛠️ **Development**

### **Local Development**

```bash
# Clone the repo
git clone https://github.com/yourusername/openagents.git
cd openagents

# Install dependencies
bun install

# Link for development
bun link

# In your project
cd /path/to/project/.opencode
bun link openagents
```

### **Build**

```bash
bun run build
```

### **Test**

```bash
bun test
```

### **Type Check**

```bash
bun run typecheck
```

---

## 🤝 **Contributing**

We welcome contributions! Here's how:

### **1. Create an Agent**

Create a `.md` file with your agent prompt:

```markdown
---
description: "Clear, concise description"
mode: "subagent"
---

Your detailed prompt...
```

### **2. Test It**

Add to `.openagents/agents/` and test locally.

### **3. Submit a PR**

Submit a pull request with:
- Clear description
- Example usage
- Any special requirements

### **Agent Guidelines**

- **Be specific**: Clear, focused purpose
- **Be helpful**: Include examples and constraints
- **Be safe**: Don't enable dangerous tools by default
- **Be tested**: Verify it works before submitting

---

## 📁 **Project Structure**

```
openagents/
├── src/
│   ├── agents/          # Agent loading
│   ├── features/        # Core features
│   ├── plugin/          # Plugin entry
│   └── utils/           # Utilities
├── .openagents/
│   ├── agents/          # Example agents
│   └── config.json      # Example config
├── archive/             # Historical docs
├── README.md            # This file
├── CONFIGURATION.md     # Config guide
├── PLUGIN-SYSTEM-EXPLAINED.md  # Plugin guide
└── CHANGELOG.md         # Version history
```

---

## 📖 **Learn More**

- **[CONFIGURATION.md](./CONFIGURATION.md)** - Complete configuration reference
- **[PLUGIN-SYSTEM-EXPLAINED.md](./PLUGIN-SYSTEM-EXPLAINED.md)** - How plugins work
- **[CHANGELOG.md](./CHANGELOG.md)** - What's new
- **[OpenCode Docs](https://opencode.ai/docs)** - OpenCode documentation

---

## 📄 **License**

MIT

---

## 🙏 **Acknowledgments**

Built for [OpenCode](https://opencode.ai) by the community.

---

**Questions? Check the [CONFIGURATION.md](./CONFIGURATION.md) or open an issue!**

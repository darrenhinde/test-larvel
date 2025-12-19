# OpenAgents Documentation

**Complete documentation for the OpenAgents plugin system.**

---

## 📚 **Documentation Index**

### **Getting Started**
- **[Main README](../README.md)** - Quick start and overview
- **[Configuration Guide](../CONFIGURATION.md)** - Complete configuration reference

### **Plugin System**
- **[Plugin System Guide](./plugin/PLUGIN-SYSTEM.md)** - How OpenCode plugins work

### **Workflow System** (In Development)
- **[Workflow Overview](./workflow/README.md)** - Workflow system overview
- **[Workflow Specification](./workflow/SPECIFICATION.md)** - Technical specification
- **[Implementation Guide](./workflow/IMPLEMENTATION.md)** - Implementation roadmap
- **[Phase 1 Complete](./workflow/PHASE-1-COMPLETE.md)** - Phase 1 completion report

---

## 🎯 **Quick Links**

### **For Users**
- [Quick Start](../README.md#-quick-start)
- [Agent Format](../README.md#-agent-format)
- [Configuration](../CONFIGURATION.md)

### **For Developers**
- [Plugin System](./plugin/PLUGIN-SYSTEM.md)
- [Development Setup](../README.md#️-development)
- [Contributing](../README.md#-contributing)

### **For Workflow Development**
- [Workflow Specification](./workflow/SPECIFICATION.md)
- [Implementation Guide](./workflow/IMPLEMENTATION.md)
- [Current Progress](./workflow/PHASE-1-COMPLETE.md)

---

## 📁 **Project Structure**

```
openagents/
├── docs/                           # Documentation
│   ├── README.md                   # This file
│   ├── plugin/                     # Plugin system docs
│   │   └── PLUGIN-SYSTEM.md
│   └── workflow/                   # Workflow system docs
│       ├── README.md
│       ├── SPECIFICATION.md
│       ├── IMPLEMENTATION.md
│       └── PHASE-1-COMPLETE.md
│
├── src/                            # Source code
│   ├── agents/                     # Agent loading
│   ├── features/                   # Core features
│   ├── plugin/                     # Plugin entry
│   ├── workflow/                   # Workflow system (in development)
│   └── utils/                      # Utilities
│
├── .openagents/                    # Example configuration
│   ├── agents/                     # Example agents
│   └── config.json                 # Example config
│
├── archive/                        # Historical documentation
├── README.md                       # Main readme
├── CONFIGURATION.md                # Configuration guide
└── CHANGELOG.md                    # Version history
```

---

## 🚀 **What is OpenAgents?**

OpenAgents is a plugin for [OpenCode](https://opencode.ai) that makes it easy to create, share, and manage specialized AI agents.

### **Key Features**
- ✅ **Simple** - Agents are `.md` files with optional frontmatter
- ✅ **Modular** - Each agent has a specific purpose
- ✅ **Configurable** - Fine-grained control via `config.json`
- ✅ **Workflow System** - Orchestrate multi-agent workflows (in development)

---

## 📖 **Documentation Sections**

### **1. Plugin System**
Learn how OpenCode plugins work, how to install and configure them.

**Read**: [Plugin System Guide](./plugin/PLUGIN-SYSTEM.md)

### **2. Workflow System**
Learn about the workflow orchestration system for multi-agent tasks.

**Read**: [Workflow Documentation](./workflow/README.md)

### **3. Configuration**
Complete reference for all configuration options.

**Read**: [Configuration Guide](../CONFIGURATION.md)

---

## 🤝 **Contributing**

We welcome contributions! See the [main README](../README.md#-contributing) for guidelines.

---

## 📄 **License**

MIT - See [LICENSE](../LICENSE) for details.

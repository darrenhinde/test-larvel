# OpenAgents - Project Structure

**Complete project organization and file structure**

---

## 📁 **Directory Structure**

```
openagents/
├── .openagents/                    # Example configuration
│   ├── agents/                     # Example agent definitions
│   │   ├── coder.md
│   │   ├── researcher.md
│   │   └── reviewer.md
│   ├── config.json                 # Active config
│   └── config.example.json         # Example config
│
├── .opencode/                      # OpenCode integration (for testing)
│   ├── agent/
│   │   └── openOne.md
│   └── opencode.json
│
├── src/                            # Source code
│   ├── agents/                     # Agent loading system
│   │   ├── index.ts
│   │   ├── loader.ts
│   │   └── types.ts
│   │
│   ├── features/                   # Core features
│   │   ├── context.ts              # Context management
│   │   ├── task-tracker.ts         # Task tracking
│   │   ├── ui.ts                   # UI interactions
│   │   ├── visibility.ts           # Visibility controls
│   │   └── index.ts
│   │
│   ├── plugin/                     # Plugin entry point
│   │   ├── config.ts               # Configuration loading
│   │   └── index.ts                # Main plugin
│   │
│   ├── workflow/                   # Workflow system (Phase 1 complete)
│   │   ├── context/
│   │   │   ├── context.ts          # Context management
│   │   │   └── context.test.ts     # Context tests
│   │   ├── index.ts                # Public API
│   │   ├── schema.ts               # Zod schemas
│   │   ├── schema.test.ts          # Schema tests
│   │   ├── types.ts                # Type definitions
│   │   ├── validator.ts            # Workflow validator
│   │   └── validator.test.ts       # Validator tests
│   │
│   ├── utils/                      # Utilities
│   │   ├── chunker.ts              # Text chunking
│   │   └── index.ts
│   │
│   └── index.ts                    # Main entry point
│
├── test/                           # Tests
│   ├── config.test.ts              # Config tests
│   ├── features.test.ts            # Feature tests
│   ├── loader.test.ts              # Loader tests
│   └── plugin.test.ts              # Plugin tests
│
├── docs/                           # Documentation
│   ├── README.md                   # Documentation hub
│   │
│   ├── plugin/                     # Plugin documentation
│   │   └── PLUGIN-SYSTEM.md        # Plugin system guide
│   │
│   └── workflow/                   # Workflow documentation
│       ├── README.md               # Workflow overview
│       ├── SPECIFICATION.md        # Technical specification
│       ├── IMPLEMENTATION.md       # Implementation guide
│       └── PHASE-1-COMPLETE.md     # Phase 1 completion
│
├── archive/                        # Historical documentation
│   ├── implementation/             # Old implementation docs
│   ├── old-summaries/              # Old summaries
│   ├── v1-planning/                # V1 planning docs
│   ├── workflow-planning/          # Workflow planning docs
│   ├── workflow-tasks/             # Workflow task breakdown
│   ├── CLEANUP-SUMMARY.md
│   ├── README.md
│   ├── START-HERE.md
│   └── WORKFLOW-SYSTEM-FINAL-PLAN.md
│
├── README.md                       # Main readme
├── CONFIGURATION.md                # Configuration guide
├── CHANGELOG.md                    # Version history
├── DOCUMENTATION-CONSOLIDATION.md  # Doc consolidation summary
├── PROJECT-STRUCTURE.md            # This file
├── package.json                    # Package configuration
├── tsconfig.json                   # TypeScript configuration
└── bun.lock                        # Dependency lock file
```

---

## 📋 **File Organization**

### **Root Level** (Essential files only)
```
README.md                           # Project overview
CONFIGURATION.md                    # Configuration reference
CHANGELOG.md                        # Version history
DOCUMENTATION-CONSOLIDATION.md      # Doc consolidation summary
PROJECT-STRUCTURE.md                # This file
package.json                        # Package config
tsconfig.json                       # TypeScript config
bun.lock                            # Lock file
```

### **Source Code** (`src/`)
```
agents/                             # Agent loading system
├── index.ts                        # Public API
├── loader.ts                       # Load agents from .md files
└── types.ts                        # Agent type definitions

features/                           # Core features
├── context.ts                      # Context file management
├── task-tracker.ts                 # Task tracking
├── ui.ts                           # UI interactions
├── visibility.ts                   # Visibility controls
└── index.ts                        # Feature exports

plugin/                             # Plugin system
├── config.ts                       # Configuration loading
└── index.ts                        # Main plugin entry

workflow/                           # Workflow orchestration (Phase 1 ✅)
├── context/
│   ├── context.ts                  # Immutable context management
│   └── context.test.ts             # Context tests (21 tests)
├── index.ts                        # Public API
├── schema.ts                       # Zod validation schemas
├── schema.test.ts                  # Schema tests (25 tests)
├── types.ts                        # TypeScript interfaces
├── validator.ts                    # Workflow validator
└── validator.test.ts               # Validator tests (20 tests)

utils/                              # Utilities
├── chunker.ts                      # Text chunking utilities
└── index.ts                        # Utility exports

index.ts                            # Main entry point
```

### **Tests** (`test/`)
```
config.test.ts                      # Configuration tests
features.test.ts                    # Feature integration tests
loader.test.ts                      # Agent loader tests
plugin.test.ts                      # Plugin tests
```

### **Documentation** (`docs/`)
```
README.md                           # Documentation hub

plugin/
└── PLUGIN-SYSTEM.md                # Plugin system guide

workflow/
├── README.md                       # Workflow overview
├── SPECIFICATION.md                # Technical specification
├── IMPLEMENTATION.md               # Implementation roadmap
└── PHASE-1-COMPLETE.md             # Phase 1 completion report
```

### **Configuration** (`.openagents/`)
```
agents/                             # Example agents
├── coder.md                        # Coder agent
├── researcher.md                   # Researcher agent
└── reviewer.md                     # Reviewer agent

config.json                         # Active configuration
config.example.json                 # Example configuration
```

---

## 🎯 **Key Principles**

### **1. Clear Separation**
- **Source code** → `src/`
- **Tests** → `test/` and `src/**/*.test.ts`
- **Documentation** → `docs/`
- **Configuration** → `.openagents/`
- **Archive** → `archive/`

### **2. Co-located Tests**
- Workflow tests are co-located with source: `src/workflow/*.test.ts`
- Integration tests are in `test/`
- This makes it easy to find tests for specific modules

### **3. Documentation Organization**
- **User docs** → Root level (`README.md`, `CONFIGURATION.md`)
- **Technical docs** → `docs/` organized by topic
- **Historical docs** → `archive/`

### **4. Minimal Root**
- Only essential files in root
- Everything else organized in subdirectories
- Easy to navigate and understand

---

## 📊 **File Counts**

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/` | 20 | Source code |
| `test/` | 4 | Integration tests |
| `src/workflow/` | 7 | Workflow system (3 source + 3 tests + 1 index) |
| `docs/` | 6 | Documentation |
| `.openagents/` | 5 | Example configuration |
| `archive/` | 30+ | Historical documentation |
| **Root** | **8** | **Essential files only** |

---

## 🧪 **Test Organization**

### **Unit Tests** (Co-located)
```
src/workflow/context/context.test.ts    # 21 tests
src/workflow/schema.test.ts             # 25 tests
src/workflow/validator.test.ts          # 20 tests
```

### **Integration Tests** (test/)
```
test/config.test.ts                     # Config loading tests
test/features.test.ts                   # Feature integration tests
test/loader.test.ts                     # Agent loader tests
test/plugin.test.ts                     # Plugin integration tests
```

### **Test Coverage**
- **Workflow system**: 66 tests, ~95% coverage ✅
- **Plugin system**: 3 test files
- **Total**: 70+ tests

---

## 📚 **Documentation Organization**

### **User-Facing** (Root)
```
README.md                               # Quick start, overview
CONFIGURATION.md                        # Configuration reference
CHANGELOG.md                            # Version history
```

### **Technical** (docs/)
```
docs/README.md                          # Documentation hub
docs/plugin/PLUGIN-SYSTEM.md            # Plugin architecture
docs/workflow/README.md                 # Workflow overview
docs/workflow/SPECIFICATION.md          # Technical spec
docs/workflow/IMPLEMENTATION.md         # Implementation guide
docs/workflow/PHASE-1-COMPLETE.md       # Progress report
```

### **Historical** (archive/)
```
archive/workflow-planning/              # Original planning docs
archive/workflow-tasks/                 # Original task breakdown
archive/v1-planning/                    # V1 planning
archive/implementation/                 # Old implementation docs
```

---

## 🔍 **Finding Things**

### **"How do I configure OpenAgents?"**
→ `CONFIGURATION.md`

### **"How do plugins work?"**
→ `docs/plugin/PLUGIN-SYSTEM.md`

### **"What is the workflow system?"**
→ `docs/workflow/README.md`

### **"How is the workflow system implemented?"**
→ `docs/workflow/SPECIFICATION.md`

### **"What's the current progress?"**
→ `docs/workflow/PHASE-1-COMPLETE.md`

### **"Where is the source code?"**
→ `src/` (organized by feature)

### **"Where are the tests?"**
→ `test/` (integration) and `src/**/*.test.ts` (unit)

### **"Where is the old documentation?"**
→ `archive/`

---

## ✅ **Structure Quality**

### **Strengths**
- ✅ Clear separation of concerns
- ✅ Minimal root directory (8 files)
- ✅ Organized documentation
- ✅ Co-located tests
- ✅ Preserved history in archive
- ✅ Easy to navigate

### **Improvements Made**
- ✅ Moved `test-features.ts` → `test/features.test.ts`
- ✅ Consolidated workflow docs → `docs/workflow/`
- ✅ Moved plugin docs → `docs/plugin/`
- ✅ Archived old planning docs
- ✅ Created documentation hub

---

## 🎯 **Best Practices Followed**

1. **Separation of Concerns** - Each directory has a clear purpose
2. **Co-located Tests** - Tests near the code they test
3. **Minimal Root** - Only essential files in root
4. **Clear Documentation** - Organized by topic, easy to find
5. **Preserved History** - Nothing deleted, all in archive
6. **Consistent Naming** - Clear, descriptive names
7. **Logical Grouping** - Related files grouped together

---

## 📖 **Quick Reference**

### **I want to...**

| Task | Location |
|------|----------|
| Get started | `README.md` |
| Configure the plugin | `CONFIGURATION.md` |
| Understand plugins | `docs/plugin/PLUGIN-SYSTEM.md` |
| Learn about workflows | `docs/workflow/README.md` |
| See technical specs | `docs/workflow/SPECIFICATION.md` |
| Check progress | `docs/workflow/PHASE-1-COMPLETE.md` |
| Find source code | `src/` |
| Run tests | `bun test` |
| Add an agent | `.openagents/agents/` |
| View history | `archive/` |

---

## ✅ **Summary**

**Clean, organized, maintainable project structure!**

- 📁 **8 root files** (essential only)
- 📚 **6 organized docs** (by topic)
- 🧪 **70+ tests** (unit + integration)
- 🗄️ **Complete archive** (nothing lost)
- 🎯 **Clear navigation** (easy to find)

---

**Project structure is clean and well-organized!** ✅

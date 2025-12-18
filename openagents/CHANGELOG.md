# Changelog

All notable changes to OpenAgents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2025-12-18

### Added

#### Core Features
- **Agent Loading System**: Load agents from `.md` files with YAML frontmatter
- **Configuration System**: Flexible configuration via `.openagents/config.json`
- **Task Tracking**: Automatic tracking of agent lifecycle (start/complete/error)
- **Context Sharing**: Save and load context between agents via JSON files
- **Toast Notifications**: Visual feedback for agent start/complete/error events
- **Text Chunking**: Smart text splitting on natural boundaries (3k limit)

#### Prefix System
- **Agent Prefixes**: Distinguish OpenAgents-managed agents with prefixes
  - `(Open)` for primary agents
  - `(OpenSub)` for subagents
  - Customizable per agent or globally
- **Prefix Toggle**: Enable/disable prefixes via `add_prefix` config

#### Visibility Controls
- **Default Visibility**: Control which agents can see subagents
  - Default: `["plan", "build"]` (only plan and build agents)
  - Configurable globally via `default_visible_to`
- **Per-Agent Visibility**: Fine-grained control per agent
  - `["*"]` = visible to all
  - `["agent1", "agent2"]` = visible to specific agents
  - `[]` = not visible (effectively disabled)

#### Configuration Options
- **Opt-In Approach**: Plugin disabled by default (`enabled: false`)
- **Model Configuration**: Set default model and per-agent overrides
- **Temperature Control**: Configure temperature per agent
- **Tool Control**: Enable/disable tools per agent
- **Parallel Execution**: Configure parallel execution and limits

#### Developer Experience
- **Version Popup**: Shows plugin version and loaded agents on session start
- **Enhanced Logging**: Clear console output for debugging
- **Error Handling**: Graceful failure handling throughout
- **TypeScript Support**: Full TypeScript types and definitions

### Technical Details

#### Architecture
- **Functional Design**: Pure functions for logic, impure clearly separated
- **Modular Structure**: Small, focused modules (~50-100 lines each)
- **Event-Driven**: Hooks into OpenCode lifecycle events
- **Bun-Native**: Uses modern `node:fs/promises` APIs

#### Files Added
- `src/features/task-tracker.ts` (103 lines)
- `src/features/context.ts` (63 lines)
- `src/features/ui.ts` (52 lines)
- `src/features/visibility.ts` (73 lines)
- `src/utils/chunker.ts` (97 lines)

#### Configuration Schema
- Added `enabled` flag (opt-in)
- Added `add_prefix` flag
- Added `primary_prefix` and `subagent_prefix`
- Added `default_visible_to` array
- Added `show_version_popup` flag
- Added `visible_to` per-agent array
- Added `prefix` per-agent override

### Documentation
- **README.md**: Project overview and quick start
- **CONFIGURATION.md**: Complete configuration reference
- **PLUGIN-SYSTEM-EXPLAINED.md**: How OpenCode plugins work
- **CHANGELOG.md**: This file
- **Example Config**: `.openagents/config.example.json` with comments

### Example Agents
- **researcher**: Research and exploration agent
- **coder**: Code implementation agent
- **reviewer**: Code review agent

---

## [Unreleased]

### Planned Features
- Agent performance metrics
- Cost tracking per agent
- Agent composition (agents calling agents)
- Hot reloading of agent definitions
- Context cleanup (TTL-based)
- Task cleanup (keep last N)

---

## Version History

- **0.1.0** (2025-12-18) - Initial release

---

## Upgrade Guide

### From Nothing to 0.1.0

1. **Install the plugin**:
   ```bash
   cd .opencode
   bun add openagents
   ```

2. **Register in OpenCode**:
   ```json
   // .opencode/opencode.json
   {
     "plugin": ["openagents"]
   }
   ```

3. **Enable the plugin**:
   ```json
   // .openagents/config.json
   {
     "enabled": true
   }
   ```

4. **Create agents**:
   ```markdown
   <!-- .openagents/agents/my-agent.md -->
   ---
   description: "My agent"
   mode: "subagent"
   ---
   Your agent prompt...
   ```

5. **Start OpenCode**:
   ```bash
   opencode
   ```

---

## Breaking Changes

None (initial release)

---

## Deprecations

None (initial release)

---

## Security

No security issues reported.

---

## Contributors

- Development Team

---

**For more details, see the [README](./README.md) and [CONFIGURATION](./CONFIGURATION.md) documentation.**

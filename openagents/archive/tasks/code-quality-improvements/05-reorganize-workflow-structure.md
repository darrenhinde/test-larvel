# Task 05: Reorganize Workflow Structure

**Estimated Time:** 4 hours  
**Priority:** MEDIUM  
**Status:** ⏳ Pending

---

## 🎯 Objective

Reorganize workflow files for better clarity and maintainability.

---

## 📋 Current Structure

```
workflow/
├── context/
│   └── context.ts          ← Unnecessary nesting
├── executors/
│   ├── base.ts
│   ├── agent.ts            ← Contains 3 executors
│   └── index.ts
├── agent-resolver.ts        ← Should be in integration/
├── opencode-agent-executor.ts ← Should be in integration/
├── executor.ts
├── validator.ts
├── schema.ts
└── types.ts
```

---

## 🔨 Proposed Structure

```
workflow/
├── core/
│   ├── executor.ts         ← Main orchestrator
│   ├── context.ts          ← Flattened from context/
│   ├── validator.ts
│   └── guards.ts           ← Extract guards from executor.ts
├── executors/
│   ├── base.ts
│   ├── agent.ts            ← Only AgentStepExecutor
│   ├── transform.ts        ← Extracted
│   ├── condition.ts        ← Extracted
│   └── index.ts
├── integration/
│   ├── opencode.ts         ← Renamed from opencode-agent-executor.ts
│   ├── resolver.ts         ← Renamed from agent-resolver.ts
│   └── index.ts
├── types.ts
├── schema.ts
└── index.ts
```

---

## 🔨 Implementation Steps

1. Create new directories
2. Move and rename files
3. Update imports
4. Update exports
5. Test everything still works

---

## ✅ Acceptance Criteria

- [ ] Files organized logically
- [ ] No unnecessary nesting
- [ ] Clear module boundaries
- [ ] All imports updated
- [ ] All tests passing

---

## ⏭️ Next Task

`06-add-feature-registration.md`

# Context Flow - Visual Example

## Simple Sequential Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow: feature-development                 │
└─────────────────────────────────────────────────────────────────┘

Input: "Add dark mode toggle"

┌─────────────────────────────────────────────────────────────────┐
│ Step 1: PLAN                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Agent receives:                                                  │
│   {                                                              │
│     input: "Add dark mode toggle",                              │
│     context: {}                                                  │
│   }                                                              │
│                                                                  │
│ Agent returns:                                                   │
│   {                                                              │
│     files: ["theme.ts", "toggle.tsx"],                          │
│     approach: "CSS variables + React context"                   │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Context Updated:
                    results.plan = {...}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: CODE                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Agent receives:                                                  │
│   {                                                              │
│     input: "Add dark mode toggle",                              │
│     context: {                                                   │
│       plan: {                          ← Previous step result   │
│         files: ["theme.ts", "toggle.tsx"],                      │
│         approach: "CSS variables + React context"               │
│       }                                                          │
│     }                                                            │
│   }                                                              │
│                                                                  │
│ Agent returns:                                                   │
│   {                                                              │
│     filesCreated: ["theme.ts", "toggle.tsx"],                   │
│     changes: "Implemented dark mode"                            │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Context Updated:
                    results.plan = {...}
                    results.code = {...}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: TEST                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Agent receives:                                                  │
│   {                                                              │
│     input: "Add dark mode toggle",                              │
│     context: {                                                   │
│       plan: { ... },                   ← All previous results   │
│       code: {                                                    │
│         filesCreated: ["theme.ts", "toggle.tsx"],               │
│         changes: "Implemented dark mode"                        │
│       }                                                          │
│     }                                                            │
│   }                                                              │
│                                                                  │
│ Agent returns:                                                   │
│   {                                                              │
│     passed: 15,                                                  │
│     failed: 0,                                                   │
│     coverage: 95                                                 │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Final Context:
                    results.plan = {...}
                    results.code = {...}
                    results.test = {...}
```

---

## Parallel Workflow with Context Sharing

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow: comprehensive-test                  │
└─────────────────────────────────────────────────────────────────┘

Input: "Test the application"

┌─────────────────────────────────────────────────────────────────┐
│ Step 1: CODE                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Returns: { filesCreated: [...], changes: "..." }                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Context: results.code = {...}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: PARALLEL TESTS                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Unit Tests   │      │ Integration  │      │ E2E Tests    │
├──────────────┤      ├──────────────┤      ├──────────────┤
│ Receives:    │      │ Receives:    │      │ Receives:    │
│   {          │      │   {          │      │   {          │
│     input,   │      │     input,   │      │     input,   │
│     context: │      │     context: │      │     context: │
│       code   │      │       code   │      │       code   │
│   }          │      │   }          │      │   }          │
│              │      │              │      │              │
│ Returns:     │      │ Returns:     │      │ Returns:     │
│   {          │      │   {          │      │   {          │
│     passed:  │      │     passed:  │      │     passed:  │
│       15     │      │       5      │      │       10     │
│   }          │      │   }          │      │   }          │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ↓
                    Results Collected:
                    results["parallel-tests"] = {
                      data: [
                        { stepId: "unit", result: {...} },
                        { stepId: "integration", result: {...} },
                        { stepId: "e2e", result: {...} }
                      ]
                    }
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: REPORT                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Agent receives:                                                  │
│   {                                                              │
│     input: "Test the application",                              │
│     context: {                                                   │
│       code: { ... },                                             │
│       "parallel-tests": {                                        │
│         data: [                                                  │
│           { stepId: "unit", result: { passed: 15 } },           │
│           { stepId: "integration", result: { passed: 5 } },     │
│           { stepId: "e2e", result: { passed: 10 } }             │
│         ]                                                        │
│       }                                                          │
│     }                                                            │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Explicit Input References

```
┌─────────────────────────────────────────────────────────────────┐
│ Workflow with Explicit References                               │
└─────────────────────────────────────────────────────────────────┘

{
  "steps": [
    { "id": "plan", "agent": "planner", "next": "code" },
    { "id": "code", "agent": "coder", "input": "plan", "next": "test" },
    { "id": "test", "agent": "tester", "input": "code" }
  ]
}

┌─────────────────────────────────────────────────────────────────┐
│ Step 1: PLAN                                                     │
│ Returns: { files: [...], approach: "..." }                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: CODE (with input: "plan")                               │
├─────────────────────────────────────────────────────────────────┤
│ Agent receives:                                                  │
│   {                                                              │
│     input: "...",                                                │
│     plan: {                            ← Explicitly referenced  │
│       files: [...],                                              │
│       approach: "..."                                            │
│     },                                                           │
│     context: {                         ← Full context           │
│       plan: { ... }                                              │
│     }                                                            │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: TEST (with input: "code")                               │
├─────────────────────────────────────────────────────────────────┤
│ Agent receives:                                                  │
│   {                                                              │
│     input: "...",                                                │
│     code: {                            ← Explicitly referenced  │
│       filesCreated: [...],                                       │
│       changes: "..."                                             │
│     },                                                           │
│     context: {                         ← Full context           │
│       plan: { ... },                                             │
│       code: { ... }                                              │
│     }                                                            │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Context Isolation in Parallel Steps

```
                    Shared Context (Read-Only)
                    ┌─────────────────────┐
                    │ input: "..."        │
                    │ results: {          │
                    │   code: {...}       │
                    │ }                   │
                    └─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Step A       │      │ Step B       │      │ Step C       │
│              │      │              │      │              │
│ Reads:       │      │ Reads:       │      │ Reads:       │
│   context ✓  │      │   context ✓  │      │   context ✓  │
│              │      │              │      │              │
│ Writes:      │      │ Writes:      │      │ Writes:      │
│   isolated   │      │   isolated   │      │   isolated   │
│   result     │      │   result     │      │   result     │
│              │      │              │      │              │
│ Cannot see:  │      │ Cannot see:  │      │ Cannot see:  │
│   Step B ✗   │      │   Step A ✗   │      │   Step A ✗   │
│   Step C ✗   │      │   Step C ✗   │      │   Step B ✗   │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ↓
                    Results Merged into Context
                    ┌─────────────────────┐
                    │ results: {          │
                    │   code: {...},      │
                    │   parallel: {       │
                    │     A: {...},       │
                    │     B: {...},       │
                    │     C: {...}        │
                    │   }                 │
                    │ }                   │
                    └─────────────────────┘
```

---

## Key Takeaways

### ✅ Automatic Context Injection
Every step automatically receives all previous step results via `context` object.

### ✅ Explicit References
Steps can explicitly reference specific previous steps via `input` field.

### ✅ Immutable Context
Context is never mutated - each step adds to a new context.

### ✅ Parallel Isolation
Parallel steps share read-only context but cannot see each other's results.

### ✅ Progressive Accumulation
Context grows as workflow progresses, building up complete history.

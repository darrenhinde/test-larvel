# Task 04: Add Input Validation

**Estimated Time:** 2 hours  
**Priority:** HIGH  
**Status:** ✅ Complete  
**Dependencies:** Task 01 (Type Safety), Task 03 (Error Messages)  
**Completed:** December 18, 2024  
**Implemented By:** Subagent (general)

---

## 🎯 Objective

Add comprehensive input validation at all function boundaries to fail fast with clear error messages.

---

## 📋 Problem Statement

Functions don't validate inputs, leading to:
- Cryptic errors deep in execution
- Hard-to-debug issues
- Poor developer experience

---

## 🔨 Implementation

### Create Validation Utilities

```typescript
// src/utils/validation.ts

export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`)
  }
  return value
}

export function validateString(
  value: any,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp }
): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string, got ${typeof value}`)
  }
  
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(`${fieldName} must be at least ${options.minLength} characters`)
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must be at most ${options.maxLength} characters`)
  }
  
  if (options?.pattern && !options.pattern.test(value)) {
    throw new Error(`${fieldName} must match pattern ${options.pattern}`)
  }
  
  return value
}

export function validateArray<T>(
  value: any,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number }
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array, got ${typeof value}`)
  }
  
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(`${fieldName} must have at least ${options.minLength} items`)
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must have at most ${options.maxLength} items`)
  }
  
  return value
}

export function validateObject(
  value: any,
  fieldName: string
): Record<string, any> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object, got ${typeof value}`)
  }
  return value
}
```

### Add Validation to Key Functions

**OpenCodeAgentExecutor:**
```typescript
async execute(agentName: string, input: AgentInput): Promise<AgentResult> {
  // Validate inputs
  validateString(agentName, 'agentName', { minLength: 1 })
  validateObject(input, 'input')
  
  // ... rest of implementation
}
```

**WorkflowExecutor:**
```typescript
async execute(workflow: WorkflowDefinition, input: any): Promise<WorkflowResult> {
  // Validate workflow
  validateRequired(workflow, 'workflow')
  validateString(workflow.id, 'workflow.id', { minLength: 1 })
  validateArray(workflow.steps, 'workflow.steps', { minLength: 1 })
  
  // Validate each step
  for (const step of workflow.steps) {
    validateString(step.id, `step.id`)
    validateString(step.type, `step[${step.id}].type`)
  }
  
  // ... rest of implementation
}
```

---

## ✅ Acceptance Criteria

- [ ] Validation utilities created
- [ ] All public functions validate inputs
- [ ] Validation errors are clear and helpful
- [ ] Tests cover validation scenarios
- [ ] All tests passing

---

## ⏭️ Next Task

`05-reorganize-workflow-structure.md`

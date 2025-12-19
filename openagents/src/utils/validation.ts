/**
 * Validation Utilities
 * 
 * Helper functions for validating inputs at function boundaries.
 */

import { createInvalidValueError, createMissingFieldError } from "./errors"

/**
 * Validate required value (not null/undefined)
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required but was ${value}`)
  }
  return value
}

/**
 * Validate string with optional constraints
 */
export function validateString(
  value: any,
  fieldName: string,
  options?: { 
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    allowEmpty?: boolean
  }
): string {
  if (typeof value !== 'string') {
    throw createInvalidValueError(fieldName, value, 'string')
  }
  
  if (!options?.allowEmpty && value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`)
  }
  
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(
      `${fieldName} must be at least ${options.minLength} characters, got ${value.length}`
    )
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(
      `${fieldName} must be at most ${options.maxLength} characters, got ${value.length}`
    )
  }
  
  if (options?.pattern && !options.pattern.test(value)) {
    throw new Error(
      `${fieldName} must match pattern ${options.pattern}\n` +
      `Got: ${value}`
    )
  }
  
  return value
}

/**
 * Validate array with optional constraints
 */
export function validateArray<T>(
  value: any,
  fieldName: string,
  options?: { 
    minLength?: number
    maxLength?: number
  }
): T[] {
  if (!Array.isArray(value)) {
    throw createInvalidValueError(fieldName, value, 'array')
  }
  
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(
      `${fieldName} must have at least ${options.minLength} items, got ${value.length}`
    )
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(
      `${fieldName} must have at most ${options.maxLength} items, got ${value.length}`
    )
  }
  
  return value
}

/**
 * Validate object (not null, not array)
 */
export function validateObject(
  value: any,
  fieldName: string
): Record<string, any> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
    throw createInvalidValueError(fieldName, value, 'object (got ' + actualType + ')')
  }
  return value
}

/**
 * Validate number with optional constraints
 */
export function validateNumber(
  value: any,
  fieldName: string,
  options?: {
    min?: number
    max?: number
    integer?: boolean
  }
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw createInvalidValueError(fieldName, value, 'number')
  }
  
  if (options?.integer && !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer, got ${value}`)
  }
  
  if (options?.min !== undefined && value < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}, got ${value}`)
  }
  
  if (options?.max !== undefined && value > options.max) {
    throw new Error(`${fieldName} must be at most ${options.max}, got ${value}`)
  }
  
  return value
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: any,
  fieldName: string,
  validValues: readonly T[]
): T {
  if (!validValues.includes(value)) {
    throw new Error(
      `${fieldName} must be one of: ${validValues.join(', ')}\n` +
      `Got: ${value}`
    )
  }
  return value as T
}

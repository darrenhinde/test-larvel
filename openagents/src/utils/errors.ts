/**
 * Error Utilities
 * 
 * Helper functions for creating informative error messages.
 */

/**
 * Create error for missing required field
 */
export function createMissingFieldError(
  objectType: string,
  objectId: string,
  fieldName: string,
  availableFields: string[]
): Error {
  return new Error(
    `${objectType} '${objectId}' is missing required field '${fieldName}'.\n` +
    `Available fields: ${availableFields.join(', ')}\n` +
    `Hint: Add "${fieldName}": <value> to the ${objectType} definition.`
  )
}

/**
 * Create error for not found item
 */
export function createNotFoundError(
  itemType: string,
  itemName: string,
  availableItems: string[],
  suggestion?: string
): Error {
  let message = `${itemType} '${itemName}' not found.\n`
  
  if (availableItems.length > 0) {
    message += `Available ${itemType.toLowerCase()}s: ${availableItems.join(', ')}\n`
  } else {
    message += `No ${itemType.toLowerCase()}s are currently available.\n`
  }
  
  if (suggestion) {
    message += `Hint: ${suggestion}`
  }
  
  return new Error(message)
}

/**
 * Create error for invalid value
 */
export function createInvalidValueError(
  fieldName: string,
  actualValue: any,
  expectedType: string,
  validValues?: string[]
): Error {
  let message = `Invalid value for '${fieldName}': expected ${expectedType}, got ${typeof actualValue}.\n`
  message += `Actual value: ${JSON.stringify(actualValue)}\n`
  
  if (validValues && validValues.length > 0) {
    message += `Valid values: ${validValues.join(', ')}\n`
  }
  
  return new Error(message)
}

/**
 * Create error for timeout
 */
export function createTimeoutError(
  operation: string,
  timeoutMs: number,
  context?: Record<string, any>
): Error {
  const timeoutSec = (timeoutMs / 1000).toFixed(1)
  let message = `${operation} timed out after ${timeoutSec} seconds.\n`
  
  if (context) {
    message += `Context: ${JSON.stringify(context, null, 2)}\n`
  }
  
  message += `Hint: Consider increasing the timeout or checking for stuck operations.`
  
  return new Error(message)
}

/**
 * Create error for validation failure
 */
export function createValidationError(
  objectType: string,
  errors: Array<{ field: string; message: string }>
): Error {
  let message = `${objectType} validation failed:\n`
  
  for (const error of errors) {
    message += `  - ${error.field}: ${error.message}\n`
  }
  
  message += `\nPlease fix the errors above and try again.`
  
  return new Error(message)
}

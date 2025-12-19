/**
 * Path Security Utilities
 * 
 * Provides path validation functions to prevent directory traversal attacks.
 * These utilities ensure that file paths remain within their intended base directories.
 */

import { resolve, join, sep } from 'node:path'

/**
 * Check if a file path is safe (doesn't escape base directory)
 * 
 * @param basePath - The base directory that should contain the file
 * @param filePath - The relative file path to validate
 * @returns true if the path is safe, false if it attempts to escape
 * 
 * @example
 * ```typescript
 * isPathSafe('/app/data', 'user/file.txt')  // true
 * isPathSafe('/app/data', '../etc/passwd')  // false
 * ```
 */
export function isPathSafe(basePath: string, filePath: string): boolean {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(basePath, filePath)
  
  // Path must start with base path
  return resolvedPath.startsWith(resolvedBase + sep) || 
         resolvedPath === resolvedBase
}

/**
 * Safely join paths and validate result
 * 
 * @param basePath - The base directory that should contain the result
 * @param paths - Path segments to join
 * @returns The joined path if safe
 * @throws Error if the resulting path escapes the base directory
 * 
 * @example
 * ```typescript
 * safeJoin('/app/data', 'user', 'file.txt')  // '/app/data/user/file.txt'
 * safeJoin('/app/data', '..', 'etc/passwd')  // throws Error
 * ```
 */
export function safeJoin(basePath: string, ...paths: string[]): string {
  const joined = join(basePath, ...paths)
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(joined)
  
  if (!resolvedPath.startsWith(resolvedBase + sep) && resolvedPath !== resolvedBase) {
    throw new Error(
      `Invalid path: "${paths.join('/')}" attempts to escape base directory`
    )
  }
  
  return joined
}

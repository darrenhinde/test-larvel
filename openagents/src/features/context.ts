/**
 * Context Manager
 * 
 * Manages context sharing between agents via JSON files.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

export interface Context {
  id: string
  createdAt: string
  data: any
}

// Pure: Create context
const createContext = (name: string, data: any): Context => ({
  id: name,
  createdAt: new Date().toISOString(),
  data
})

// Impure: Context manager
export const createContextManager = (baseDir: string) => {
  const contextDir = join(baseDir, ".openagents", "context")
  
  return {
    save: async (name: string, data: any): Promise<void> => {
      await mkdir(contextDir, { recursive: true })
      
      const context = createContext(name, data)
      const path = join(contextDir, `${name}.json`)
      
      await writeFile(path, JSON.stringify(context, null, 2))
    },
    
    load: async (name: string): Promise<Context | null> => {
      const path = join(contextDir, `${name}.json`)
      
      if (!existsSync(path)) return null
      
      try {
        const content = await readFile(path, "utf-8")
        return JSON.parse(content)
      } catch (error) {
        console.error(`[OpenAgents] Failed to load context ${name}:`, error)
        return null
      }
    },
    
    exists: (name: string): boolean => {
      const path = join(contextDir, `${name}.json`)
      return existsSync(path)
    }
  }
}

export type ContextManager = ReturnType<typeof createContextManager>

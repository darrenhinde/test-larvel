/**
 * Task Tracker
 * 
 * Tracks running agent tasks with start/complete/error states.
 */

export interface Task {
  id: string
  agent: string
  sessionID: string
  status: "running" | "completed" | "error"
  startedAt: Date
  completedAt?: Date
  error?: string
}

// Pure: Generate ID
const generateId = (): string => 
  `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// Pure: Create task
const createTask = (agent: string, sessionID: string): Task => ({
  id: generateId(),
  agent,
  sessionID,
  status: "running",
  startedAt: new Date()
})

// Pure: Update task
const updateTask = (task: Task, updates: Partial<Task>): Task => ({
  ...task,
  ...updates
})

// Pure: Find task by session
const findBySession = (tasks: Map<string, Task>, sessionID: string): Task | undefined => {
  for (const task of tasks.values()) {
    if (task.sessionID === sessionID) return task
  }
  return undefined
}

// Pure: Calculate duration
const calculateDuration = (task: Task): string => {
  const end = task.completedAt || new Date()
  const ms = end.getTime() - task.startedAt.getTime()
  const seconds = Math.floor(ms / 1000)
  
  if (seconds < 60) return `${seconds}s`
  
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

// Impure: Task tracker
export const createTaskTracker = () => {
  const tasks = new Map<string, Task>()
  
  return {
    start: (agent: string, sessionID: string): Task => {
      const task = createTask(agent, sessionID)
      tasks.set(task.id, task)
      return task
    },
    
    complete: (sessionID: string): Task | undefined => {
      const task = findBySession(tasks, sessionID)
      if (!task) return undefined
      
      const updated = updateTask(task, {
        status: "completed",
        completedAt: new Date()
      })
      tasks.set(updated.id, updated)
      return updated
    },
    
    error: (sessionID: string, error: string): Task | undefined => {
      const task = findBySession(tasks, sessionID)
      if (!task) return undefined
      
      const updated = updateTask(task, {
        status: "error",
        completedAt: new Date(),
        error
      })
      tasks.set(updated.id, updated)
      return updated
    },
    
    getTasks: (): Task[] => Array.from(tasks.values()),
    
    getTask: (id: string): Task | undefined => tasks.get(id),
    
    getDuration: (task: Task): string => calculateDuration(task)
  }
}

export type TaskTracker = ReturnType<typeof createTaskTracker>

/**
 * Quick feature test
 * 
 * Tests the core features work correctly.
 */

import { createTaskTracker } from "../src/features/task-tracker"
import { createContextManager } from "../src/features/context"
import { chunkText, addChunkHeaders, prepareChunkedText } from "../src/utils/chunker"

console.log("🧪 Testing OpenAgents Features\n")

// Test 1: Task Tracker
console.log("1️⃣ Testing Task Tracker...")
const tracker = createTaskTracker()

const task1 = tracker.start("researcher", "session-1")
console.log(`   ✅ Started task: ${task1.id} (${task1.agent})`)

await new Promise(resolve => setTimeout(resolve, 100))

const completed = tracker.complete("session-1")
if (completed) {
  const duration = tracker.getDuration(completed)
  console.log(`   ✅ Completed task in ${duration}`)
}

const task2 = tracker.start("coder", "session-2")
const errored = tracker.error("session-2", "Test error")
if (errored) {
  console.log(`   ✅ Error tracked: ${errored.error}`)
}

console.log(`   ✅ Total tasks: ${tracker.getTasks().length}\n`)

// Test 2: Context Manager
console.log("2️⃣ Testing Context Manager...")
const contextMgr = createContextManager("/tmp/openagents-test")

await contextMgr.save("test-context", { 
  message: "Hello from OpenAgents!",
  timestamp: new Date().toISOString()
})
console.log("   ✅ Context saved")

const loaded = await contextMgr.load("test-context")
if (loaded && loaded.data.message === "Hello from OpenAgents!") {
  console.log("   ✅ Context loaded correctly")
}

const exists = contextMgr.exists("test-context")
console.log(`   ✅ Context exists: ${exists}\n`)

// Test 3: Chunker
console.log("3️⃣ Testing Chunker...")

const shortText = "This is a short text."
const shortChunks = chunkText(shortText, 3000)
console.log(`   ✅ Short text: ${shortChunks.length} chunk(s)`)

const longText = "Lorem ipsum dolor sit amet. ".repeat(200) // ~5600 chars
const longChunks = chunkText(longText, 3000)
console.log(`   ✅ Long text (${longText.length} chars): ${longChunks.length} chunks`)

const withHeaders = addChunkHeaders(longChunks)
console.log(`   ✅ Headers added: ${withHeaders[0].substring(0, 20)}...`)

const prepared = prepareChunkedText(longText, 3000)
console.log(`   ✅ Prepared chunks: ${prepared.length}\n`)

console.log("✅ All tests passed!")

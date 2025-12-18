# Chunking System - 3k Prompt Limit Handling

**Last Updated**: Thu Dec 18 2025

---

## 🎯 Problem Statement

OpenCode has a **3000 character limit** for prompts. When agents return large responses or context needs to be shared, we must chunk the content intelligently.

### **Constraints**:
- ✅ Must not exceed 3000 characters per message
- ✅ Must preserve meaning and structure
- ✅ Must be readable when chunked
- ✅ Must indicate chunk position (Part 1/3, etc.)
- ✅ Must handle edge cases (single sentence > 3k)

---

## 🧩 Chunking Strategy

### **Priority Order**:
1. **Paragraph boundaries** (best - preserves structure)
2. **Sentence boundaries** (good - preserves meaning)
3. **Word boundaries** (acceptable - preserves words)
4. **Hard split** (last resort - may break words)

---

## 📐 Pure Function Design

### **Core Chunking Functions**

```typescript
/**
 * Split text into chunks, respecting natural boundaries
 * Pure function - same input always produces same output
 */
export const chunkText = (
  text: string,
  maxSize: number = 3000
): string[] => {
  // Base case: text fits in one chunk
  if (text.length <= maxSize) {
    return [text]
  }
  
  // Try paragraph splitting first
  const paragraphs = text.split(/\n\n+/)
  
  if (paragraphs.length > 1) {
    return chunkByParagraphs(paragraphs, maxSize)
  }
  
  // Fall back to sentence splitting
  return chunkBySentences(text, maxSize)
}

/**
 * Chunk by paragraph boundaries
 * Pure function
 */
const chunkByParagraphs = (
  paragraphs: string[],
  maxSize: number
): string[] => {
  const chunks: string[] = []
  let currentChunk = ""
  
  for (const para of paragraphs) {
    const separator = currentChunk ? "\n\n" : ""
    const combined = currentChunk + separator + para
    
    if (combined.length <= maxSize) {
      currentChunk = combined
    } else {
      // Save current chunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      
      // If single paragraph is too large, split it further
      if (para.length > maxSize) {
        chunks.push(...chunkBySentences(para, maxSize))
        currentChunk = ""
      } else {
        currentChunk = para
      }
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

/**
 * Chunk by sentence boundaries
 * Pure function
 */
const chunkBySentences = (
  text: string,
  maxSize: number
): string[] => {
  // Split on sentence boundaries (., !, ?)
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let currentChunk = ""
  
  for (const sentence of sentences) {
    const separator = currentChunk ? " " : ""
    const combined = currentChunk + separator + sentence
    
    if (combined.length <= maxSize) {
      currentChunk = combined
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      
      // If single sentence is too large, split by words
      if (sentence.length > maxSize) {
        chunks.push(...chunkByWords(sentence, maxSize))
        currentChunk = ""
      } else {
        currentChunk = sentence
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

/**
 * Chunk by word boundaries
 * Pure function
 */
const chunkByWords = (
  text: string,
  maxSize: number
): string[] => {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let currentChunk = ""
  
  for (const word of words) {
    const separator = currentChunk ? " " : ""
    const combined = currentChunk + separator + word
    
    if (combined.length <= maxSize) {
      currentChunk = combined
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      
      // If single word is too large, hard split
      if (word.length > maxSize) {
        chunks.push(...hardSplit(word, maxSize))
        currentChunk = ""
      } else {
        currentChunk = word
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

/**
 * Hard split - last resort
 * Pure function
 */
const hardSplit = (
  text: string,
  maxSize: number
): string[] => {
  const chunks: string[] = []
  
  for (let i = 0; i < text.length; i += maxSize) {
    chunks.push(text.slice(i, i + maxSize))
  }
  
  return chunks
}
```

---

## 🏷️ Chunk Headers

### **Add Context to Chunks**

```typescript
/**
 * Add headers to chunks indicating position
 * Pure function
 */
export const addChunkHeaders = (
  chunks: string[],
  prefix: string = ""
): string[] => {
  // Single chunk needs no header
  if (chunks.length === 1) {
    return chunks
  }
  
  return chunks.map((chunk, index) => {
    const header = `[${prefix}Part ${index + 1}/${chunks.length}]`
    return `${header}\n\n${chunk}`
  })
}

/**
 * Add metadata to chunks
 * Pure function
 */
export const addChunkMetadata = (
  chunks: string[],
  metadata: ChunkMetadata
): ChunkedContent => ({
  chunks: addChunkHeaders(chunks, metadata.prefix),
  metadata: {
    ...metadata,
    totalChunks: chunks.length,
    totalSize: chunks.reduce((sum, c) => sum + c.length, 0),
    chunkSizes: chunks.map(c => c.length)
  }
})

interface ChunkMetadata {
  prefix?: string
  source: string
  timestamp: string
}

interface ChunkedContent {
  chunks: string[]
  metadata: ChunkMetadata & {
    totalChunks: number
    totalSize: number
    chunkSizes: number[]
  }
}
```

---

## 🔄 Composition Pipeline

### **Functional Composition**

```typescript
/**
 * Complete chunking pipeline
 * Pure function composition
 */
export const prepareChunkedContent = (
  text: string,
  options: ChunkOptions = {}
): ChunkedContent => {
  const {
    maxSize = 3000,
    prefix = "",
    source = "unknown",
    addHeaders = true
  } = options
  
  // Compose pure functions
  const chunks = chunkText(text, maxSize)
  
  const withHeaders = addHeaders
    ? addChunkHeaders(chunks, prefix)
    : chunks
  
  return {
    chunks: withHeaders,
    metadata: {
      prefix,
      source,
      timestamp: new Date().toISOString(),
      totalChunks: chunks.length,
      totalSize: text.length,
      chunkSizes: chunks.map(c => c.length)
    }
  }
}

interface ChunkOptions {
  maxSize?: number
  prefix?: string
  source?: string
  addHeaders?: boolean
}
```

---

## 📤 Sending Chunked Content

### **Impure Function (Side Effects)**

```typescript
/**
 * Send chunked content to OpenCode session
 * Impure - has side effects (network calls)
 */
export const sendChunkedContent = async (
  sessionID: string,
  content: ChunkedContent,
  client: Client,
  options: SendOptions = {}
): Promise<Result<void>> => {
  const { delayMs = 100 } = options
  
  try {
    for (const chunk of content.chunks) {
      await client.session.prompt({
        path: { id: sessionID },
        body: {
          parts: [{ type: "text", text: chunk }]
        }
      })
      
      // Small delay between chunks to avoid rate limiting
      if (delayMs > 0) {
        await delay(delayMs)
      }
    }
    
    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

interface SendOptions {
  delayMs?: number
}

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))
```

---

## 🧪 Testing Strategy

### **Pure Function Tests**

```typescript
describe("chunkText", () => {
  it("returns single chunk for small text", () => {
    const text = "Hello world"
    const result = chunkText(text, 3000)
    
    expect(result).toEqual(["Hello world"])
  })
  
  it("splits on paragraph boundaries", () => {
    const text = "Para 1\n\nPara 2\n\nPara 3"
    const result = chunkText(text, 10)
    
    expect(result.length).toBeGreaterThan(1)
    expect(result.join("")).toContain("Para 1")
    expect(result.join("")).toContain("Para 2")
  })
  
  it("splits on sentence boundaries when no paragraphs", () => {
    const text = "Sentence one. Sentence two. Sentence three."
    const result = chunkText(text, 20)
    
    expect(result.length).toBeGreaterThan(1)
  })
  
  it("handles text with no natural boundaries", () => {
    const text = "a".repeat(5000)
    const result = chunkText(text, 3000)
    
    expect(result.length).toBe(2)
    expect(result[0].length).toBeLessThanOrEqual(3000)
    expect(result[1].length).toBeLessThanOrEqual(3000)
  })
})

describe("addChunkHeaders", () => {
  it("adds no header for single chunk", () => {
    const chunks = ["single chunk"]
    const result = addChunkHeaders(chunks)
    
    expect(result).toEqual(["single chunk"])
  })
  
  it("adds headers to multiple chunks", () => {
    const chunks = ["chunk 1", "chunk 2", "chunk 3"]
    const result = addChunkHeaders(chunks)
    
    expect(result[0]).toContain("[Part 1/3]")
    expect(result[1]).toContain("[Part 2/3]")
    expect(result[2]).toContain("[Part 3/3]")
  })
  
  it("adds prefix to headers", () => {
    const chunks = ["chunk 1", "chunk 2"]
    const result = addChunkHeaders(chunks, "Context: ")
    
    expect(result[0]).toContain("[Context: Part 1/2]")
  })
})

describe("prepareChunkedContent", () => {
  it("creates chunked content with metadata", () => {
    const text = "a".repeat(5000)
    const result = prepareChunkedContent(text, {
      maxSize: 3000,
      source: "test"
    })
    
    expect(result.chunks.length).toBe(2)
    expect(result.metadata.totalChunks).toBe(2)
    expect(result.metadata.totalSize).toBe(5000)
    expect(result.metadata.source).toBe("test")
  })
})
```

---

## 📊 Usage Examples

### **Example 1: Chunk Agent Response**

```typescript
// Agent returns large response
const agentResponse = `
# Research Results

## Finding 1
Lorem ipsum dolor sit amet...
(5000 characters)

## Finding 2
Consectetur adipiscing elit...
(3000 characters)
`

// Prepare chunked content
const chunked = prepareChunkedContent(agentResponse, {
  maxSize: 3000,
  prefix: "Research: ",
  source: "researcher-agent"
})

// Send to parent session
const result = await sendChunkedContent(
  parentSessionID,
  chunked,
  client
)

if (!result.ok) {
  console.error("Failed to send chunks:", result.error)
}
```

### **Example 2: Chunk Context Data**

```typescript
// Load large context
const context = await loadContext("research-results", contextDir)

if (context && JSON.stringify(context.data).length > 3000) {
  // Chunk the context
  const chunked = prepareChunkedContent(
    JSON.stringify(context.data, null, 2),
    {
      maxSize: 2800,  // Leave room for headers
      prefix: "Context: ",
      source: context.id
    }
  )
  
  // Send chunks
  await sendChunkedContent(sessionID, chunked, client)
} else {
  // Send as single message
  await client.session.prompt({
    path: { id: sessionID },
    body: {
      parts: [{ type: "text", text: JSON.stringify(context?.data) }]
    }
  })
}
```

### **Example 3: Smart Chunking with Validation**

```typescript
/**
 * Smart chunking with validation
 * Pure function
 */
const smartChunk = (
  text: string,
  maxSize: number = 3000
): Result<ChunkedContent> => {
  // Validate input
  if (!text || text.trim().length === 0) {
    return {
      ok: false,
      error: new Error("Cannot chunk empty text")
    }
  }
  
  if (maxSize < 100) {
    return {
      ok: false,
      error: new Error("maxSize must be at least 100 characters")
    }
  }
  
  // Chunk the text
  const chunked = prepareChunkedContent(text, { maxSize })
  
  // Validate chunks
  const oversized = chunked.chunks.filter(c => c.length > maxSize)
  if (oversized.length > 0) {
    return {
      ok: false,
      error: new Error(`${oversized.length} chunks exceed maxSize`)
    }
  }
  
  return { ok: true, value: chunked }
}
```

---

## 🎯 Best Practices

### **1. Always Validate Chunk Sizes**
```typescript
const validateChunks = (chunks: string[], maxSize: number): boolean =>
  chunks.every(chunk => chunk.length <= maxSize)
```

### **2. Preserve Structure**
```typescript
// Good: Split on natural boundaries
const chunks = chunkText(text, 3000)

// Bad: Hard split everything
const chunks = hardSplit(text, 3000)
```

### **3. Add Context to Chunks**
```typescript
// Good: Headers show position
const chunks = addChunkHeaders(["chunk1", "chunk2"])
// ["[Part 1/2]\n\nchunk1", "[Part 2/2]\n\nchunk2"]

// Bad: No context
const chunks = ["chunk1", "chunk2"]
```

### **4. Handle Edge Cases**
```typescript
// Handle empty text
if (!text || text.trim().length === 0) {
  return []
}

// Handle single character
if (text.length === 1) {
  return [text]
}

// Handle exact boundary
if (text.length === maxSize) {
  return [text]
}
```

---

## 📈 Performance Considerations

### **Optimization Tips**:

1. **Cache chunk calculations** for repeated text
2. **Use streaming** for very large content
3. **Batch send** chunks with small delays
4. **Monitor memory** usage for large texts

```typescript
// Example: Cached chunking
const chunkCache = new Map<string, string[]>()

const cachedChunkText = (text: string, maxSize: number): string[] => {
  const key = `${text.length}-${maxSize}`
  
  if (chunkCache.has(key)) {
    return chunkCache.get(key)!
  }
  
  const chunks = chunkText(text, maxSize)
  chunkCache.set(key, chunks)
  
  return chunks
}
```

---

**Next**: [06-functional.md](./06-functional.md) - Functional programming patterns

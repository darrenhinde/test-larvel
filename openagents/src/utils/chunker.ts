/**
 * Text Chunker
 * 
 * Splits large text into chunks on natural boundaries (paragraphs, sentences).
 */

// Pure: Chunk text on natural boundaries
export const chunkText = (text: string, maxSize = 3000): string[] => {
  if (text.length <= maxSize) return [text]
  
  // Try paragraph boundaries first
  const paragraphs = text.split(/\n\n+/)
  
  if (paragraphs.length === 1) {
    // No paragraphs, try sentences
    return chunkBySentences(text, maxSize)
  }
  
  return chunkByParagraphs(paragraphs, maxSize)
}

// Pure: Chunk by paragraphs
const chunkByParagraphs = (paragraphs: string[], maxSize: number): string[] => {
  const chunks: string[] = []
  let current = ""
  
  for (const para of paragraphs) {
    const separator = current ? "\n\n" : ""
    const combined = current + separator + para
    
    if (combined.length <= maxSize) {
      current = combined
    } else {
      if (current) chunks.push(current)
      
      // If single paragraph too large, split it
      if (para.length > maxSize) {
        chunks.push(...chunkBySentences(para, maxSize))
        current = ""
      } else {
        current = para
      }
    }
  }
  
  if (current) chunks.push(current)
  return chunks
}

// Pure: Chunk by sentences
const chunkBySentences = (text: string, maxSize: number): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ""
  
  for (const sentence of sentences) {
    const separator = current ? " " : ""
    const combined = current + separator + sentence
    
    if (combined.length <= maxSize) {
      current = combined
    } else {
      if (current) chunks.push(current)
      
      // If single sentence too large, hard split
      if (sentence.length > maxSize) {
        chunks.push(...hardSplit(sentence, maxSize))
        current = ""
      } else {
        current = sentence
      }
    }
  }
  
  if (current) chunks.push(current)
  return chunks
}

// Pure: Hard split (last resort)
const hardSplit = (text: string, maxSize: number): string[] => {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += maxSize) {
    chunks.push(text.slice(i, i + maxSize))
  }
  return chunks
}

// Pure: Add headers to chunks
export const addChunkHeaders = (chunks: string[]): string[] => {
  if (chunks.length === 1) return chunks
  
  return chunks.map((chunk, i) => 
    `[Part ${i + 1}/${chunks.length}]\n\n${chunk}`
  )
}

// Pure: Prepare chunked text
export const prepareChunkedText = (text: string, maxSize = 3000): string[] => {
  const chunks = chunkText(text, maxSize)
  return addChunkHeaders(chunks)
}

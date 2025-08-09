interface CacheEntry {
  value: string
  timestamp: number
  ttl: number
}

class LRUCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  set(key: string, value: string, ttl: number = 24 * 60 * 60 * 1000): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): string | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    return entry.value
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
const threadSummaryCache = new LRUCache(100)

export function getCachedThreadSummary(userId: string, threadId: string): string | null {
  const key = `${userId}:${threadId}`
  return threadSummaryCache.get(key)
}

export function setCachedThreadSummary(userId: string, threadId: string, summary: string): void {
  const key = `${userId}:${threadId}`
  threadSummaryCache.set(key, summary, 24 * 60 * 60 * 1000) // 24 hours
}

export function clearThreadSummaryCache(): void {
  threadSummaryCache.clear()
}

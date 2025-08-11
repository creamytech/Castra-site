import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL
let client: Redis | null = null

function getClient(): Redis | null {
  if (!redisUrl) return null
  if (!client) client = new Redis(redisUrl, { maxRetriesPerRequest: 2, enableOfflineQueue: false })
  return client
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getClient()
  if (!r) return null
  try {
    const raw = await r.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  const r = getClient()
  if (!r) return
  try {
    await r.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSeconds))
  } catch {}
}

export async function bundleCacheGet(threadId: string) {
  return cacheGet<any>(`bundle:${threadId}`)
}
export async function bundleCacheSet(threadId: string, data: any, ttlSeconds = 120) {
  return cacheSet(`bundle:${threadId}`, data, ttlSeconds)
}

export async function invalidate(pattern: string) {
  const r = getClient()
  if (!r) return
  try {
    const stream = r.scanStream({ match: pattern, count: 200 })
    const toDelete: string[] = []
    for await (const keys of stream as any) {
      toDelete.push(...keys)
      if (toDelete.length >= 1000) {
        await r.del(...toDelete)
        toDelete.length = 0
      }
    }
    if (toDelete.length) await r.del(...toDelete)
  } catch {}
}

export async function pingCache() {
  const r = getClient(); if (!r) return false
  try { await r.ping(); return true } catch { return false }
}

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

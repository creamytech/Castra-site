import { Redis } from '@upstash/redis'

export type QueueItem = {
  id: string
  type: string
  payload: any
  runAt: number // epoch ms
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const QUEUE_KEY = 'agent:queue'
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

const memoryQueue: QueueItem[] = []

export async function enqueue(type: string, payload: any, runAt?: number): Promise<string> {
  const id = crypto.randomUUID()
  const item: QueueItem = { id, type, payload, runAt: runAt ?? Date.now() }
  if (redis) {
    await redis.zadd(QUEUE_KEY, { score: item.runAt, member: JSON.stringify(item) })
  } else {
    memoryQueue.push(item)
    memoryQueue.sort((a, b) => a.runAt - b.runAt)
  }
  return id
}

export async function pullDue(limit = 10): Promise<QueueItem[]> {
  const now = Date.now()
  if (redis) {
    const res = await redis.zrange<string[]>(QUEUE_KEY, 0, now, { byScore: true, offset: 0, count: limit })
    const items = (res || []).map((str: any) => JSON.parse(str as any) as QueueItem)
    if (items.length > 0) {
      // remove fetched members
      for (const str of res) {
        await redis.zrem(QUEUE_KEY, str)
      }
    }
    return items
  } else {
    const due = memoryQueue.filter(i => i.runAt <= now).slice(0, limit)
    for (const i of due) {
      const idx = memoryQueue.findIndex(x => x.id === i.id)
      if (idx >= 0) memoryQueue.splice(idx, 1)
    }
    return due
  }
}

export async function ack(_id: string): Promise<void> {
  // no-op because items are removed on pullDue
}

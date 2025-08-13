import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

export async function limit(key: string, max: number, per: string) {
  if (!redis) return { allowed: true }
  const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, per as any) })
  const r = await limiter.limit(key)
  return { allowed: r.success, reset: r.reset, remaining: r.remaining }
}



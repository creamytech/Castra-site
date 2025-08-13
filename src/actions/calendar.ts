'use server'

import { requireSession } from '@/lib/auth/require'
import { listUpcoming } from '@/lib/google/calendar'
import { cacheGet, cacheSet } from '@/lib/cache'

export async function listUpcomingCached(max = 5) {
  const { session } = await requireSession()
  const key = `calendar:upcoming:${session.user.id}:${max}`
  const cached = await cacheGet<any>(key)
  if (cached) return cached
  const now = new Date().toISOString()
  const data = await listUpcoming(session.user.id, { timeMin: now })
  const events = (data.items || []).slice(0, max).map(i => ({ id: i.id, summary: i.summary, start: i.start, end: i.end }))
  const payload = { events }
  await cacheSet(key, payload, 90)
  return payload
}



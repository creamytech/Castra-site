import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listThreads } from '@/lib/google/gmailLayer'
import { cacheGet, cacheSet } from '@/lib/cache'
import { limit } from '@/lib/rate'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const label = url.searchParams.get('label') || undefined
  const pageToken = url.searchParams.get('pageToken') || undefined
  const rate = await limit(`gmail:search:${session.user.id}`, 20, '1 m')
  if (!rate.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  const cacheKey = `gmail:list:${session.user.id}:${q}:${label || ''}:${pageToken || ''}`
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ ...cached, cached: true })
  const data = await listThreads(session.user.id, { q, pageToken, labelIds: label ? [label] : undefined })
  await cacheSet(cacheKey, data, q ? 15 : 60)
  return NextResponse.json({ ...data, cached: false })
}



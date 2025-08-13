import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { listUpcoming } from '@/lib/google/calendar'
import { cacheGet, cacheSet } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    const { searchParams } = new URL(req.url)
    const maxResults = Number(searchParams.get('max') ?? 5)
    const now = new Date().toISOString()
    const cacheKey = `calendar:upcoming:${ctx.session.user.id}:${maxResults}`
    const cached = await cacheGet<any>(cacheKey)
    if (cached) return NextResponse.json(cached)
    const data = await listUpcoming(ctx.session.user.id, { timeMin: now })
    const events = (data.items || []).slice(0, maxResults).map(i => ({ id: i.id, summary: i.summary, start: i.start, end: i.end }))
    const payload = { events }
    await cacheSet(cacheKey, payload, 90)
    return NextResponse.json(payload)
  } catch (e: any) {
    console.error('[calendar upcoming]', e)
    return NextResponse.json({ error: e?.message || String(e), events: [] }, { status: 500 })
  }
}, { action: 'calendar.upcoming' })

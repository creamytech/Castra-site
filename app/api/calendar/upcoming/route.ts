import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getGoogleClientsForUser } from '@/lib/google/getClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    const { calendar } = await getGoogleClientsForUser(ctx.session.user.id)
    const { searchParams } = new URL(req.url)
    const maxResults = Number(searchParams.get('max') ?? 5)
    const now = new Date().toISOString()
    const res = await calendar.events.list({ calendarId: 'primary', maxResults, singleEvents: true, orderBy: 'startTime', timeMin: now })
    const events = (res.data.items || []).map(i => ({ id: i.id, summary: i.summary, start: i.start, end: i.end }))
    return NextResponse.json({ events })
  } catch (e: any) {
    console.error('[calendar upcoming]', e)
    return NextResponse.json({ error: e?.message || String(e), events: [] }, { status: 500 })
  }
}, { action: 'calendar.upcoming' })

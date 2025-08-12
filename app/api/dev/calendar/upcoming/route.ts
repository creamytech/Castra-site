import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getGoogleClientsForUser } from '@/lib/google/getClient'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx, req }) => {
  const { searchParams } = new URL(req.url)
  const maxResults = Number(searchParams.get('max') ?? 10)
  const now = new Date().toISOString()
  const { calendar } = await getGoogleClientsForUser(ctx.session.user.id)
  const res = await calendar.events.list({ calendarId: 'primary', maxResults, singleEvents: true, orderBy: 'startTime', timeMin: now })
  const events = (res.data.items || []).map(i => ({ id: i.id, summary: i.summary, start: i.start, end: i.end, status: i.status }))
  return NextResponse.json({ events })
}, { action: 'dev.calendar.upcoming' })

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getGoogleAuthForUser } from '@/lib/gmail/client'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    const { oauth2 } = await getGoogleAuthForUser(ctx.session.user.id)
    const cal = google.calendar({ version: 'v3', auth: oauth2 })
    const { searchParams } = new URL(req.url)
    const days = Math.min(Number(searchParams.get('days') || 7), 30)
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const max = Math.min(Number(searchParams.get('max') || 20), 50)
    const from = searchParams.get('from') || timeMin
    const to = searchParams.get('to') || timeMax
    const { data } = await cal.events.list({ calendarId: 'primary', singleEvents: true, orderBy: 'startTime', timeMin: from, timeMax: to, maxResults: max })
    const events = (data.items || []).map(ev => ({
      id: ev.id,
      summary: ev.summary || '(No title)',
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      location: ev.location || null,
      attendees: (ev.attendees || []).map(a => a.email).filter(Boolean),
      link: ev.htmlLink || null
    }))
    return NextResponse.json({ events })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (/insufficientPermissions|forbidden/i.test(msg)) {
      return NextResponse.json({ error: 'MISSING_SCOPE', scope: 'calendar.readonly' }, { status: 403 })
    }
    if (/invalid_grant|unauthorized_client|invalid_token/i.test(msg)) {
      return NextResponse.json({ error: 'INVALID_TOKENS', reconnect: true }, { status: 401 })
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}, { action: 'dev.calendar.upcoming' })



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/agent/skills/calendar'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { when, duration = 30, attendees = [], dealId } = await req.json()
    if (!when) return NextResponse.json({ error: 'when required' }, { status: 400 })

    const start = new Date(when)
    const end = new Date(start.getTime() + duration * 60000)
    const created = await createCalendarEvent(ctx.session.user.id, { summary: 'Showing', startISO: start.toISOString(), endISO: end.toISOString(), attendees: attendees.map((e: string)=>({ email: e })) })
    const createdSafe = JSON.parse(JSON.stringify(created))
    if (dealId) await prisma.activity.create({ data: { dealId, userId: ctx.session.user.id, kind: 'MEETING', channel: 'calendar', subject: 'Showing scheduled', body: '', meta: { created: createdSafe } } })
    return NextResponse.json({ success: true, created })
  } catch (e: any) {
    console.error('[inbox schedule]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.message.schedule' })

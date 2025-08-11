import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { getFreeBusy } from '@/src/lib/google-calendar'
import { parseAndProposeTimes } from '@/src/ai/parseAndProposeTimes'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { leadId } = await req.json()
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { user: true } })
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const conn = await (prisma as any).connection.findFirst({ where: { userId: lead.userId, provider: 'google' } })
    const timeMin = new Date().toISOString(); const timeMax = new Date(Date.now() + 3*24*60*60*1000).toISOString()
    const busy = conn ? await getFreeBusy({ connectionId: conn.id, timeMin, timeMax }) : []
    const prefs = { timeZone: 'America/New_York', workHours: { start: 9, end: 18 }, meetingLenMinutes: 60, styleGuide: (lead as any).user?.styleGuide }
    const body = lead.description || ''
    const subject = lead.title || ''
    const out = await parseAndProposeTimes({ body, subject, userPrefs: prefs, calendarBusy: busy })
    await prisma.lead.update({ where: { id: leadId }, data: { /* attrs JSON merge */ } as any })
    return NextResponse.json({ schedule: out })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'schedule.propose' })



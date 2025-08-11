import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { getFreeBusy } from '@/src/lib/google-calendar'
import { parseAndProposeTimes } from '@/src/ai/parseAndProposeTimes'
import { getSchedulingPrefs } from '@/lib/personalization'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx, params }: any) => {
  try {
    const leadId = params.leadId as string
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: ctx.session.user.id }, include: { user: true } })
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const conn = await (prisma as any).connection.findFirst({ where: { userId: lead.userId, provider: 'google' } })
    const prefs = await getSchedulingPrefs(lead.userId)
    const timeMin = new Date().toISOString(); const timeMax = new Date(Date.now() + 3*24*60*60*1000).toISOString()
    const busy = conn ? await getFreeBusy({ connectionId: conn.id, timeMin, timeMax }) : []
    const subject = lead.title || ''
    const body = lead.description || ''
    const out = await parseAndProposeTimes({ subject, body, userPrefs: { ...prefs, styleGuide: (lead as any).user?.styleGuide }, calendarBusy: busy })
    await prisma.lead.update({ where: { id: lead.id }, data: { /* attrs JSON merge */ } as any })
    // Keep draft refreshed in queued state if exists
    const existing = await prisma.draft.findFirst({ where: { userId: ctx.session.user.id, leadId: lead.id, status: { in: ['queued','snoozed'] } }, orderBy: { updatedAt: 'desc' } })
    return NextResponse.json({ leadId, schedule: out, draftId: existing?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
})



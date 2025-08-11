import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { createEvent } from '@/src/lib/google-calendar'
import { sendReplyFromDraft } from '@/src/lib/gmail-send'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { leadId, start, end } = await req.json()
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const conn = await (prisma as any).connection.findFirst({ where: { userId: lead.userId, provider: 'google' } })
    if (!conn) return NextResponse.json({ error: 'no google connection' }, { status: 400 })
    const evt = await createEvent({ connectionId: conn.id, threadId: (lead as any).threadId, toEmail: (lead as any).fromEmail || '', toName: (lead as any).fromName || '', summary: `Property tour — ${lead.title || ''}`, start, end, location: (lead as any).attrs?.address, description: `Lead ${lead.id}` })
    await sendReplyFromDraft(conn.id, (lead as any).threadId || '', (lead as any).fromEmail || '', `Re: ${lead.title || 'Tour'}`, `Confirmed ${new Date(start).toLocaleString()}–${new Date(end).toLocaleTimeString()}. Invite: ${evt.htmlLink}`)
    return NextResponse.json({ ok: true, event: evt })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'schedule.book' })



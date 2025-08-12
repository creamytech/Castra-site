import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { createEvent } from '@/src/lib/google-calendar'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { leadId, start, end } = await req.json()
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: ctx.session.user.id } })
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const conn = await (prisma as any).connection?.findFirst?.({ where: { userId: ctx.session.user.id, provider: 'google' } })
    if (!conn?.id) return NextResponse.json({ error: 'no google connection' }, { status: 400 })
    const toEmail = lead.fromEmail || (lead.attrs as any)?.email
    if (!toEmail) return NextResponse.json({ error: 'no recipient' }, { status: 400 })
    const out = await createEvent({ connectionId: conn.id, threadId: lead.threadId || undefined, toEmail, toName: lead.fromName || undefined, summary: `Showing: ${lead.subject || lead.title || ''}`, start, end, description: 'Scheduled via Castra' })
    return NextResponse.json({ ok: true, event: out })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'schedule.book' })

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
    // Idempotency: check if an event at same time already exists for this lead/thread
    const existing = await (prisma as any).eventSuggestion?.findFirst?.({ where: { userId: lead.userId, messageId: (lead as any).providerMsgId || '', startISO: start, endISO: end, status: 'created' } })
    let evt
    if (existing?.createdEventId) {
      evt = { id: existing.createdEventId, htmlLink: '' }
    } else {
      evt = await createEvent({ connectionId: conn.id, threadId: (lead as any).threadId, toEmail: (lead as any).fromEmail || '', toName: (lead as any).fromName || '', summary: `Property tour — ${lead.title || ''}`, start, end, location: (lead as any).attrs?.address, description: `Lead ${lead.id}` })
      try { await (prisma as any).eventSuggestion?.create?.({ data: { userId: lead.userId, messageId: (lead as any).providerMsgId || '', summary: `Property tour — ${lead.title || ''}`, startISO: start, endISO: end, status: 'created', createdEventId: evt.id } }) } catch {}
    }
    const msg = `Confirmed ${new Date(start).toLocaleString()}–${new Date(end).toLocaleTimeString()}. Invite: ${evt.htmlLink || ''}`
    await sendReplyFromDraft(conn.id, (lead as any).threadId || '', (lead as any).fromEmail || '', `Re: ${lead.title || 'Tour'}`, msg)
    return NextResponse.json({ ok: true, event: evt })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'schedule.book' })



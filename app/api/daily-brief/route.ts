import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { sendReplyFromDraft } from '@/src/lib/gmail-send'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    const now = new Date()
    const rows = await prisma.draft.findMany({
      where: {
        userId: ctx.session.user.id,
        status: { in: ['queued', 'snoozed'] },
        OR: [ { status: 'queued' }, { status: 'snoozed', snoozeUntil: { lte: now } } ]
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { lead: true }
    })
    // Enrich with extracted/score/reasons from thread if available
    const items = await Promise.all(rows.map(async (d) => {
      let leadInfo: any = d.lead ? { id: d.lead.id, status: d.lead.status, title: d.lead.title } : {}
      try {
        // Find thread metadata for score/reasons/extracted
        const thread = await prisma.emailThread.findFirst({ where: { id: d.threadId, userId: ctx.session.user.id }, select: { status: true, score: true, reasons: true, extracted: true } })
        if (thread) {
          leadInfo = {
            ...(leadInfo || {}),
            status: thread.status || leadInfo.status,
            score: thread.score || 0,
            reasons: (thread.reasons as any) || [],
            attrs: { ...(leadInfo?.attrs || {}), ...(thread.extracted as any) }
          }
        }
      } catch {}
      return { ...d, lead: leadInfo }
    }))
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.list' })

export const PATCH = withAuth(async ({ req, ctx }) => {
  try {
    const { id, action, payload } = await req.json().catch(() => ({}))
    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    const draft = await prisma.draft.findFirst({ where: { id, userId: ctx.session.user.id } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })

    if (action === 'dismiss') {
      await prisma.draft.update({ where: { id }, data: { status: 'dismissed' } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'snooze') {
      const minutes = Math.max(5, Math.min(1440, Number(payload?.minutes || 30)))
      const until = new Date(Date.now() + minutes * 60 * 1000)
      await prisma.draft.update({ where: { id }, data: { status: 'snoozed', snoozeUntil: until } })
      return NextResponse.json({ ok: true, snoozeUntil: until })
    }
    if (action === 'approve') {
      // Approve and send immediately unless quiet hours; queue otherwise
      const profile = await prisma.userProfile.findFirst({ where: { userId: ctx.session.user.id } })
      const policy = await prisma.autonomyPolicy.findFirst({ where: { userId: ctx.session.user.id, stage: 'LEAD' } })
      const now = new Date(); const hour = now.getHours();
      const inQuiet = policy?.quietStart != null && policy?.quietEnd != null && (
        policy.quietStart < policy.quietEnd ? (hour >= policy.quietStart && hour < policy.quietEnd) : (hour >= policy.quietStart || hour < policy.quietEnd)
      )
      if (inQuiet) {
        const sendAt = new Date();
        sendAt.setHours((policy!.quietEnd ?? 8), 10, 0, 0)
        await prisma.task.create({ data: { userId: ctx.session.user.id, type: 'SEND_APPROVED_DRAFT', status: 'PENDING', runAt: sendAt, payload: { draftId: id } } })
        await prisma.draft.update({ where: { id }, data: { status: 'approved' } })
        return NextResponse.json({ ok: true, queuedFor: sendAt.toISOString() })
      }
      // fall-through: send now
      const meta: any = draft.meta as any
      const toEmail = meta?.to || meta?.recipient || meta?.email
      const subject = payload?.subject || draft.subject
      const bodyText = payload?.bodyText || draft.bodyText
      if (!toEmail) return NextResponse.json({ error: 'missing recipient' }, { status: 400 })
      // Use connectionId if present; else rely on account tokens by user in downstream util
      try {
        await sendReplyFromDraft(ctx.session.user.id, draft.threadId, toEmail, subject, bodyText)
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'send failed' }, { status: 500 })
      }
      await prisma.draft.update({ where: { id }, data: { status: 'sent' } })
      // Mark notification
      await prisma.notification.create({ data: { userId: ctx.session.user.id, type: 'draft', title: 'Draft sent', body: subject, link: `/dashboard/inbox/${draft.threadId}` } })
      return NextResponse.json({ ok: true, sent: true })
    }
    if (action === 'regenerate') {
      // Placeholder: rely on existing drafting endpoint
      return NextResponse.json({ ok: true })
    }
    if (action === 'edit') {
      const subject = String(payload?.subject || draft.subject)
      const bodyText = String(payload?.bodyText || draft.bodyText)
      await prisma.draft.update({ where: { id }, data: { subject, bodyText } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.update' })



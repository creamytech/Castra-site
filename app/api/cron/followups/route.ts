import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueue } from '@/lib/agent/queue'
import { sendReplyFromDraft } from '@/src/lib/gmail-send'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const deals = await prisma.deal.findMany({ select: { id: true, userId: true, nextDue: true }, where: { nextDue: { lte: new Date() } } })
    for (const d of deals) {
      await enqueue('TIMER_FOLLOWUP', { userId: d.userId, dealId: d.id })
    }
    // Also process approved drafts scheduled after quiet hours
    const tasks = await prisma.task.findMany({ where: { type: 'SEND_APPROVED_DRAFT', status: 'PENDING', runAt: { lte: new Date() } }, take: 50 })
    let sent = 0
    for (const t of tasks) {
      try {
        const { draftId } = (t.payload as any) || {}
        if (!draftId) { await prisma.task.update({ where: { id: t.id }, data: { status: 'FAILED', error: 'missing draftId' } }); continue }
        const d = await prisma.draft.findFirst({ where: { id: draftId } })
        if (!d) { await prisma.task.update({ where: { id: t.id }, data: { status: 'FAILED', error: 'draft not found' } }); continue }
        const toEmail = (d.meta as any)?.to
        if (!toEmail) { await prisma.task.update({ where: { id: t.id }, data: { status: 'FAILED', error: 'missing recipient' } }); continue }
        await sendReplyFromDraft(d.userId, d.threadId, toEmail, d.subject, d.bodyText)
        await prisma.draft.update({ where: { id: d.id }, data: { status: 'sent' } })
        await prisma.task.update({ where: { id: t.id }, data: { status: 'DONE' } })
        await prisma.notification.create({ data: { userId: d.userId, type: 'draft', title: 'Draft sent', body: d.subject, link: `/dashboard/inbox/${d.threadId}` } })
        sent++
      } catch (e: any) {
        await prisma.task.update({ where: { id: t.id }, data: { status: 'FAILED', error: e?.message || 'error' } })
      }
    }
    return NextResponse.json({ queued: deals.length, sent })
  } catch (e: any) {
    console.error('[cron followups]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

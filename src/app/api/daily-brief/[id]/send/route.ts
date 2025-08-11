import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReplyFromDraft } from '@/src/lib/gmail-send'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const { subject, bodyText } = await req.json().catch(() => ({}))
  const draft = await prisma.draft.findUnique({ where: { id }, include: { lead: true, user: true } })
  if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Quiet hours (America/New_York)
  const quietStart = 22, quietEnd = 7
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date()))
  const inQuiet = quietStart < quietEnd ? hour >= quietStart && hour < quietEnd : hour >= quietStart || hour < quietEnd

  if (inQuiet) {
    const runAt = new Date(); runAt.setHours(quietEnd, 10, 0, 0)
    await prisma.draft.update({ where: { id }, data: { status: 'approved', meta: { ...(draft.meta as any), deferredSendAt: runAt } } })
    // If you want delayed send: mailQueue.add('send-draft', { draftId: id }, { delay: Math.max(0, runAt.getTime() - Date.now()) })
    return NextResponse.json({ ok: true, deferred: true })
  }

  const to = (draft.lead as any)?.fromEmail || ''
  const conn = await (prisma as any).connection?.findFirst?.({ where: { userId: draft.userId, provider: 'google' } })
  if (!conn?.id) return NextResponse.json({ error: 'no google connection' }, { status: 400 })
  await sendReplyFromDraft(conn.id, draft.threadId, to, subject || draft.subject, bodyText || draft.bodyText)
  await prisma.draft.update({ where: { id }, data: { status: 'sent' } })
  await prisma.lead.update({ where: { id: draft.leadId }, data: { status: 'follow_up' } })
  await (prisma as any).eventLog?.create?.({ data: { userId: draft.userId, type: 'draft_send', meta: { id } } })
  return NextResponse.json({ ok: true })
}



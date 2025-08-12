import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/websocket'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { status } = await req.json()
    const thread = await prisma.emailThread.update({ where: { id: params.id }, data: { status } })
    // Auto-enqueue draft when marked as Lead/Potential
    if (status === 'lead' || status === 'potential') {
      const last = await prisma.emailMessage.findFirst({ where: { userId: ctx.session.user.id, threadId: params.id }, orderBy: { date: 'desc' } })
      const toEmail = last?.from?.match(/<([^>]+)>/)?.[1] || undefined
      const subject = thread.subject ? `Re: ${thread.subject}` : 'Thanks for reaching out'
      try {
        await prisma.draft.upsert({
          where: { userId_leadId_threadId_status: { userId: ctx.session.user.id, leadId: thread.dealId || 'email', threadId: params.id, status: 'queued' } as any },
          update: {},
          create: { userId: ctx.session.user.id, leadId: thread.dealId || 'email', threadId: params.id, subject, bodyText: `Hi there,\n\nThanks for your note.`, meta: { to: toEmail, reasons: thread.reasons, extracted: thread.extracted } as any },
        })
        const n = await prisma.notification.create({ data: { userId: ctx.session.user.id, type: 'draft', title: 'Draft ready for approval', body: subject, link: '/daily-brief' } })
        await notifyUser(ctx.session.user.id, 'notification', { id: n.id, type: 'draft', title: 'Draft ready for approval', body: subject, link: '/daily-brief', createdAt: n.createdAt })
      } catch {}
    }
    return NextResponse.json({ ok: true, thread })
  } catch (e: any) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.status' })



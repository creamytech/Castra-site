import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/websocket-server'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { status } = await req.json()
    const thread = await prisma.emailThread.update({ where: { id: params.id }, data: { status } })
    // Auto-enqueue draft when marked as Lead/Potential and ensure pipeline upsert
    if (status === 'lead' || status === 'potential') {
      const last = await prisma.emailMessage.findFirst({ where: { userId: ctx.session.user.id, threadId: params.id }, orderBy: { date: 'desc' } })
      const toEmail = last?.from?.match(/<([^>]+)>/)?.[1] || undefined
      const subject = thread.subject ? `Re: ${thread.subject}` : 'Thanks for reaching out'
      try {
        // Idempotent Contact+Deal
        const from = last?.from || ''
        const m = from.match(/"?([^\"]+)"?\s*<([^>]+)>/)
        const name = m ? m[1].trim() : (from.split('@')[0] || 'Lead')
        const email = m ? m[2] : (from.includes('@') ? from : undefined)
        let contact = email ? await prisma.contact.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, email: { equals: email, mode: 'insensitive' } } }) : null
        if (!contact) {
          contact = await prisma.contact.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName: name.split(' ')[0] || 'Lead', lastName: name.split(' ').slice(1).join(' '), email: email || null, tags: ['lead'] } })
        }
        let deal = await prisma.deal.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, OR: [ { emailThreads: { some: { id: params.id } } }, { contactId: contact?.id, stage: 'LEAD' } ] } as any })
        if (!deal) {
          const maxPos = await prisma.deal.aggregate({ _max: { position: true }, where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage: 'LEAD' } })
          const nextPos = (maxPos._max.position ?? 0) + 1
          deal = await prisma.deal.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, contactId: contact?.id || undefined, title: thread.subject || 'New Lead', type: 'BUYER', stage: 'LEAD', position: nextPos, nextAction: 'Reply to lead', nextDue: new Date() } })
          await prisma.activity.create({ data: { dealId: deal.id, userId: ctx.session.user.id, orgId: ctx.orgId, kind: 'NOTE', channel: 'system', subject: 'Created from Lead', meta: { threadId: params.id } } })
        }
        await prisma.emailThread.update({ where: { id: params.id }, data: { dealId: deal.id } }).catch(()=>{})
        await prisma.emailMessage.updateMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, threadId: params.id }, data: { dealId: deal.id, contactId: contact?.id || undefined } })
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



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { type = 'BUYER', title } = await req.json()

    // Try to infer from latest message in thread
    const msg = await prisma.emailMessage.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, threadId: params.id }, orderBy: { date: 'desc' } })
    const subject = title || msg?.snippet || 'New Deal'
    // Position at end of LEAD column
    const maxPos = await prisma.deal.aggregate({ _max: { position: true }, where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage: 'LEAD' } })
    const nextPos = (maxPos._max.position ?? 0) + 1
    const deal = await prisma.deal.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, title: subject, type, stage: 'LEAD', position: nextPos, nextAction: 'Reply to lead', nextDue: new Date() } })

    // Create contact from sender
    const from = msg?.from || ''
    const match = from.match(/\"?([^\"]+)\"?\s*<([^>]+)>/)
    let firstName = 'Lead', lastName = '', email = ''
    if (match) { const parts = match[1].split(' '); firstName = parts[0] || 'Lead'; lastName = parts.slice(1).join(' '); email = match[2] }
    // De-dupe by email if exists
    let contact = await prisma.contact.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, email: email || undefined } })
    if (!contact) {
      contact = await prisma.contact.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName, lastName, email, tags: ['email'] } })
    }
    await prisma.dealContact.create({ data: { dealId: deal.id, contactId: contact.id } })

    // Link thread/messages
    await prisma.emailThread.update({ where: { id: params.id }, data: { dealId: deal.id } }).catch(() => {})
    await prisma.emailMessage.updateMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, threadId: params.id }, data: { dealId: deal.id, contactId: contact.id } })

    await prisma.activity.create({ data: { dealId: deal.id, userId: ctx.session.user.id, kind: 'EMAIL', channel: 'email', subject: 'Thread attached', body: '', meta: { threadId: params.id } } })

    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[inbox create-deal]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.create-deal' })

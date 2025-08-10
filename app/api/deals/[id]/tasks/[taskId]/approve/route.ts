import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/agent/skills/sms'
import { sendEmail } from '@/lib/agent/skills/gmail'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (_ctx, { params }: any) => {
  try {
    const { ctx } = _ctx as any
    const task = await prisma.task.findFirst({ where: { id: params.taskId, userId: ctx.session.user.id, orgId: ctx.orgId, dealId: params.id } })
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const draft = (task.result as any)?.draft || ''
    const channel = (task.payload as any)?.channel || 'email'

    // Find primary contact
    const primary = await prisma.dealContact.findFirst({ where: { dealId: params.id }, include: { contact: true } })
    if (!primary?.contact) return NextResponse.json({ error: 'No contact on deal' }, { status: 400 })

    if (channel === 'sms') {
      if (!primary.contact.phone) return NextResponse.json({ error: 'Contact missing phone' }, { status: 400 })
      await sendSMS(primary.contact.phone, draft)
      await prisma.interaction.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: params.id, contactId: primary.contactId, channel: 'sms', direction: 'out', body: draft } })
    } else {
      if (!primary.contact.email) return NextResponse.json({ error: 'Contact missing email' }, { status: 400 })
      await sendEmail(ctx.session.user.id, primary.contact.email, (task.payload as any)?.subject || 'Re: your inquiry', draft, (task.payload as any)?.threadId)
      await prisma.interaction.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: params.id, contactId: primary.contactId, channel: 'email', direction: 'out', subject: (task.payload as any)?.subject || '', body: draft } })
    }

    await prisma.task.update({ where: { id: task.id }, data: { status: 'DONE', result: { ...(task.result as any), sentAt: new Date().toISOString() } } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[task approve]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}, { action: 'deal.task.approve' })

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/agent/skills/sms'
import { sendEmail } from '@/lib/agent/skills/gmail'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const task = await prisma.task.findFirst({ where: { id: params.taskId, userId: session.user.id, dealId: params.id } })
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const draft = (task.result as any)?.draft || ''
    const channel = (task.payload as any)?.channel || 'email'

    // Find primary contact
    const primary = await prisma.dealContact.findFirst({ where: { dealId: params.id }, include: { contact: true } })
    if (!primary?.contact) return NextResponse.json({ error: 'No contact on deal' }, { status: 400 })

    if (channel === 'sms') {
      if (!primary.contact.phone) return NextResponse.json({ error: 'Contact missing phone' }, { status: 400 })
      await sendSMS(primary.contact.phone, draft)
      await prisma.interaction.create({ data: { userId: session.user.id, dealId: params.id, contactId: primary.contactId, channel: 'sms', direction: 'out', body: draft } })
    } else {
      if (!primary.contact.email) return NextResponse.json({ error: 'Contact missing email' }, { status: 400 })
      await sendEmail(session.user.id, primary.contact.email, (task.payload as any)?.subject || 'Re: your inquiry', draft, (task.payload as any)?.threadId)
      await prisma.interaction.create({ data: { userId: session.user.id, dealId: params.id, contactId: primary.contactId, channel: 'email', direction: 'out', subject: (task.payload as any)?.subject || '', body: draft } })
    }

    await prisma.task.update({ where: { id: task.id }, data: { status: 'DONE', result: { ...(task.result as any), sentAt: new Date().toISOString() } } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[task approve]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

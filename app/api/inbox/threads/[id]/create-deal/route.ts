import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { type = 'BUYER', title } = await request.json()

    // Try to infer from latest message in thread
    const msg = await prisma.emailMessage.findFirst({ where: { userId: session.user.id, threadId: params.id }, orderBy: { date: 'desc' } })
    const subject = title || msg?.snippet || 'New Deal'
    const deal = await prisma.deal.create({ data: { userId: session.user.id, title: subject, type, stage: 'LEAD', nextAction: 'Reply to lead', nextDue: new Date() } })

    // Create contact from sender
    const from = msg?.from || ''
    const match = from.match(/\"?([^\"]+)\"?\s*<([^>]+)>/)
    let firstName = 'Lead', lastName = '', email = ''
    if (match) { const parts = match[1].split(' '); firstName = parts[0] || 'Lead'; lastName = parts.slice(1).join(' '); email = match[2] }
    const contact = await prisma.contact.create({ data: { userId: session.user.id, firstName, lastName, email, tags: ['email'] } })
    await prisma.dealContact.create({ data: { dealId: deal.id, contactId: contact.id } })

    // Link thread/messages
    await prisma.emailThread.update({ where: { id: params.id }, data: { dealId: deal.id } }).catch(() => {})
    await prisma.emailMessage.updateMany({ where: { userId: session.user.id, threadId: params.id }, data: { dealId: deal.id, contactId: contact.id } })

    await prisma.activity.create({ data: { dealId: deal.id, userId: session.user.id, kind: 'EMAIL', channel: 'email', subject: 'Thread attached', body: '', meta: { threadId: params.id } } })

    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[inbox create-deal]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

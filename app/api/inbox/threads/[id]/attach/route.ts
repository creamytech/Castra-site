import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { dealId } = await request.json()
    if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

    // Link EmailThread if exists
    const thread = await prisma.emailThread.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (thread) {
      await prisma.emailThread.update({ where: { id: thread.id }, data: { dealId } })
      await prisma.emailMessage.updateMany({ where: { threadId: thread.id, userId: session.user.id }, data: { dealId } })
    }

    // Fallback: update legacy Message
    await prisma.message.updateMany({ where: { userId: session.user.id, threadId: params.id }, data: { /* nothing to set in legacy */ } })

    await prisma.activity.create({ data: { dealId, userId: session.user.id, kind: 'EMAIL', channel: 'email', subject: 'Linked email thread', body: '', meta: { threadId: params.id } } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[inbox attach]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

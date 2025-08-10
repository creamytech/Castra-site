import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const thread = await prisma.emailThread.findFirst({ where: { id: params.id, userId: session.user.id }, include: { messages: { orderBy: { date: 'asc' } }, deal: true } })
    if (thread) return NextResponse.json({ thread })

    // fallback
    const msgs = await prisma.message.findMany({ where: { userId: session.user.id, threadId: params.id }, orderBy: { internalDate: 'asc' } })
    return NextResponse.json({ thread: { id: params.id, messages: msgs } })
  } catch (e: any) {
    console.error('[inbox thread GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {

    const thread = await prisma.emailThread.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { messages: { orderBy: { date: 'asc' } }, deal: true } })
    if (thread) return NextResponse.json({ thread })

    // fallback
    const msgs = await prisma.message.findMany({ where: { userId: ctx.session.user.id, threadId: params.id }, orderBy: { internalDate: 'asc' } })
    return NextResponse.json({ thread: { id: params.id, messages: msgs } })
  } catch (e: any) {
    console.error('[inbox thread GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.get' })

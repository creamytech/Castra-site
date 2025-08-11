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
    // attempt to fetch full bodies if missing via Gmail if we have a recent message id
    try {
      const last = msgs[msgs.length-1]
      if (last?.id) {
        // optional enhancement: fetch Gmail full bodies server-side here
      }
    } catch {}
    return NextResponse.json({ thread: { id: params.id, messages: msgs } })
  } catch (e: any) {
    console.error('[inbox thread GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.get' })

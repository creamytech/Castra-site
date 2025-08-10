import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { dealId } = await req.json()
    if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })

    // Link EmailThread if exists
    const thread = await prisma.emailThread.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (thread) {
      await prisma.emailThread.update({ where: { id: thread.id }, data: { dealId } })
      await prisma.emailMessage.updateMany({ where: { threadId: thread.id, userId: ctx.session.user.id, orgId: ctx.orgId }, data: { dealId } })
    }

    // Fallback: update legacy Message
    await prisma.message.updateMany({ where: { userId: ctx.session.user.id, threadId: params.id }, data: { /* nothing to set in legacy */ } })

    await prisma.activity.create({ data: { dealId, userId: ctx.session.user.id, kind: 'EMAIL', channel: 'email', subject: 'Linked email thread', body: '', meta: { threadId: params.id } } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[inbox attach]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.attach' })

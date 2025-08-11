import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Accepts free-text improvements and binary signals
export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { threadId, messageId, kind, good, bad, note } = await req.json().catch(() => ({}))
    if (!threadId && !messageId && !note) return NextResponse.json({ error: 'missing payload' }, { status: 400 })
    await prisma.activity.create({ data: {
      userId: ctx.session.user.id,
      orgId: ctx.orgId,
      dealId: null,
      kind: 'AI_SUMMARY',
      channel: 'feedback',
      subject: kind || (good ? 'good' : (bad ? 'bad' : 'note')),
      body: note || '',
      meta: { threadId, messageId, good: !!good, bad: !!bad }
    } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'feedback.capture' })



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx, params }: any) => {
  try {
    const dealId = params?.id as string
    if (!dealId) return NextResponse.json({ error: 'deal id required' }, { status: 400 })
    const { text, subject, kind } = await req.json().catch(()=>({})) as { text?: string; subject?: string; kind?: string }
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

    // Create Activity as a note to avoid schema changes
    const activity = await prisma.activity.create({
      data: {
        dealId,
        userId: ctx.session.user.id,
        orgId: ctx.session.user.orgId || undefined,
        kind: 'AI_SUMMARY',
        channel: 'inbox',
        subject: subject || 'AI Summary',
        body: text,
      } as any,
    })
    return NextResponse.json({ ok: true, id: activity.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'deal.note.create' })



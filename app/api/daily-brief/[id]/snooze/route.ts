import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const id = params.id as string
    const { minutes = 60 } = await req.json().catch(() => ({ minutes: 60 }))
    const draft = await prisma.draft.findFirst({ where: { id, userId: ctx.session.user.id } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const until = new Date(Date.now() + Math.max(5, Math.min(1440, Number(minutes))) * 60 * 1000)
    await prisma.draft.update({ where: { id }, data: { status: 'snoozed', snoozeUntil: until } })
    return NextResponse.json({ ok: true, snoozeUntil: until.toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.snooze' })



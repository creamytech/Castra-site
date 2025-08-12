import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const id = params.id as string
    const draft = await prisma.draft.findFirst({ where: { id, userId: ctx.session.user.id } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
    await prisma.draft.update({ where: { id }, data: { status: 'dismissed' } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.dismiss' })



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json().catch(() => ({})) as { dataUrl?: string }
    const dataUrl = body?.dataUrl || ''
    if (!dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }
    if (dataUrl.length > 750_000) {
      return NextResponse.json({ error: 'Image too large. Please upload a smaller image.' }, { status: 400 })
    }

    await prisma.user.update({ where: { id: ctx.session.user.id }, data: { image: dataUrl } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update avatar' }, { status: 500 })
  }
})



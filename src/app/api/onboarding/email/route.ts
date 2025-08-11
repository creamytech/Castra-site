import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/api'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { watchLabels = [], threshold = 70, quiet } = await req.json()
    const user = await prisma.user.update({ where: { id: ctx.session.user.id }, data: { watchLabels, threshold, quiet } })
    return NextResponse.json({ ok: true, user })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'onboarding.email' })



import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx, req }, { params }: any) => {
  const id = params.id as string
  const { status } = await req.json()
  const lead = await prisma.lead.update({ where: { id, userId: ctx.session.user.id }, data: { isLocked: true, overrideStatus: status ?? undefined, lockedAt: new Date(), status: status ?? undefined } })
  return NextResponse.json({ lead })
}, { action: 'crm.lead.lock' })

export const DELETE = withAuth(async ({ ctx }, { params }: any) => {
  const id = params.id as string
  const lead = await prisma.lead.update({ where: { id, userId: ctx.session.user.id }, data: { isLocked: false, lockedAt: null } })
  return NextResponse.json({ lead })
}, { action: 'crm.lead.unlock' })



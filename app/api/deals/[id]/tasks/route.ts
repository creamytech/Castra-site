import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }, { params }: any) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const tasks = await prisma.task.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: params.id, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ tasks })
}, { action: 'deal.tasks.list' })

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const tasks = await prisma.task.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, ...(status ? { status } : {}) }, orderBy: { runAt: 'asc' }, take: limit })
  return NextResponse.json({ tasks })
}, { action: 'tasks.list' })

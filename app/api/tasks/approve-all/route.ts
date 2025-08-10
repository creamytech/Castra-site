import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }) => {
  const tasks = await prisma.task.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, status: 'NEEDS_APPROVAL' }, take: 50 })
  for (const t of tasks) {
    await prisma.task.update({ where: { id: t.id }, data: { status: 'DONE', result: { ...(t.result as any), approvedAt: new Date().toISOString() } } })
  }
  return NextResponse.json({ approved: tasks.length })
}, { action: 'tasks.approve-all' })

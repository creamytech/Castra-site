import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tasks = await prisma.task.findMany({ where: { userId: session.user.id, status: 'NEEDS_APPROVAL' }, take: 50 })
  for (const t of tasks) {
    await prisma.task.update({ where: { id: t.id }, data: { status: 'DONE', result: { ...(t.result as any), approvedAt: new Date().toISOString() } } })
  }
  return NextResponse.json({ approved: tasks.length })
}

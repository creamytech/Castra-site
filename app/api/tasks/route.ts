import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const tasks = await prisma.task.findMany({ where: { userId: session.user.id, ...(status ? { status } : {}) }, orderBy: { runAt: 'asc' }, take: limit })
  return NextResponse.json({ tasks })
}

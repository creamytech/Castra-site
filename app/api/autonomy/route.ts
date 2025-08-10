import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage') as any
  if (!stage) return NextResponse.json({ error: 'stage required' }, { status: 400 })
  const policy = await prisma.autonomyPolicy.findFirst({ where: { userId: session.user.id, stage } })
  return NextResponse.json({ policy })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { stage, level, quietStart, quietEnd, channelCaps } = body
  if (!stage || !level) return NextResponse.json({ error: 'stage and level required' }, { status: 400 })
  const existing = await prisma.autonomyPolicy.findFirst({ where: { userId: session.user.id, stage } })
  const data = { userId: session.user.id, stage, level, quietStart: quietStart ?? null, quietEnd: quietEnd ?? null, channelCaps: channelCaps ?? null }
  const policy = existing ? await prisma.autonomyPolicy.update({ where: { id: existing.id }, data }) : await prisma.autonomyPolicy.create({ data })
  return NextResponse.json({ policy })
}

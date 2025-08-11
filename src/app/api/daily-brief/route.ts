import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const items = await prisma.draft.findMany({
    where: { status: { in: ['queued','snoozed'] }, OR: [{ snoozeUntil: null }, { snoozeUntil: { lte: new Date() } }] },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
    include: { lead: true }
  })
  return NextResponse.json({ items })
}



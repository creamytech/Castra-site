import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  await prisma.draft.update({ where: { id }, data: { status: 'dismissed' } })
  await (prisma as any).eventLog?.create?.({ data: { type: 'draft_dismissed', meta: { id } } })
  return NextResponse.json({ ok: true })
}



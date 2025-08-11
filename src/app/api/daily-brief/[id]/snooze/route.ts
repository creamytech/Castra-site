import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { minutes = 60 } = await req.json().catch(() => ({ minutes: 60 }))
  const id = params.id
  const when = new Date(Date.now() + Number(minutes) * 60_000)
  await prisma.draft.update({ where: { id }, data: { status: 'snoozed', snoozeUntil: when } })
  await (prisma as any).eventLog?.create?.({ data: { type: 'draft_snoozed', meta: { id, minutes } } })
  return NextResponse.json({ ok: true })
}



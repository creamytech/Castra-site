import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cancelEvent } from '@/src/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { leadId, eventId } = await req.json()
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
    await cancelEvent({ eventId, userId: lead.userId })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}



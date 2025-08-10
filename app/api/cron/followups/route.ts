import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueue } from '@/lib/agent/queue'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const deals = await prisma.deal.findMany({ select: { id: true, userId: true, nextDue: true }, where: { nextDue: { lte: new Date() } } })
    for (const d of deals) {
      await enqueue('TIMER_FOLLOWUP', { userId: d.userId, dealId: d.id })
    }
    return NextResponse.json({ queued: deals.length })
  } catch (e: any) {
    console.error('[cron followups]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

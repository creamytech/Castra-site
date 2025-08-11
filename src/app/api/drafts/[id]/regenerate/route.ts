import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mailQueue } from '@/src/lib/queue'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const draft = await prisma.draft.findUnique({ where: { id: params.id } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
    // Rebuild schedule and draft using the background pipeline
    await mailQueue.add('refresh-thread', { leadId: draft.leadId }, { jobId: `refresh-${draft.leadId}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}



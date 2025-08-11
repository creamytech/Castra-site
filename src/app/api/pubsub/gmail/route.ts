import { NextRequest, NextResponse } from 'next/server'
import { verifyPubsub } from '../../../../lib/verifyPubsub'
import { mailQueue } from '../../../../lib/queue'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Envelope = z.object({ message: z.object({ data: z.string() }) })
const PushData = z.object({ emailAddress: z.string().email(), historyId: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    verifyPubsub(req)
    const envelope = Envelope.parse(await req.json())
    const data = PushData.parse(JSON.parse(Buffer.from(envelope.message.data, 'base64').toString('utf-8')))

    // Map email to connection
    const conn = await (prisma as any).connection?.findFirst?.({ where: { provider: 'google', email: data.emailAddress }, select: { id: true } })
    if (!conn?.id) return NextResponse.json({ ok: true, ignored: true })

    await mailQueue.add('fetch-updates', { connectionId: conn.id }, { jobId: `fetch-${conn.id}-${Date.now()}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}



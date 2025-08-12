import { NextRequest, NextResponse } from 'next/server'
import { gmailQueue } from '@/src/lib/queue'
import { metricIncr } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Google Pub/Sub push endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    // Buffer/coalesce by scheduling a single fetch-updates job per connection after 10s
    const messageData = body?.message?.data
    if (!messageData) return NextResponse.json({ ok: false }, { status: 400 })
    const decoded = Buffer.from(messageData, 'base64').toString('utf-8')
    const msg = JSON.parse(decoded)
    const emailAddress: string | undefined = msg.emailAddress
    await metricIncr('gmail.pubsub.received', 1)
    if (!emailAddress) return NextResponse.json({ ok: true })

    // Map email to connection(s)
    const { prisma } = await import('@/lib/prisma')
    const conns = await (prisma as any).connection.findMany({ where: { provider: 'google', user: { email: emailAddress } }, select: { id: true } })
    for (const c of conns) {
      await gmailQueue.add('fetch-updates', { connectionId: c.id }, {
        jobId: `fetch-${c.id}`,
        delay: 10_000,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000
      })
    }
    return NextResponse.json({ ok: true, queued: conns.length })
  } catch (e: any) {
    console.error('[gmail.push] error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}



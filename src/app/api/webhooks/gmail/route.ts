import { NextRequest, NextResponse } from 'next/server'
import { verifyPubsub } from '../../../../lib/verifyPubsub'
import { mailQueue } from '../../../../lib/queue'

export async function POST(req: NextRequest) {
  verifyPubsub(req)
  const msg = await req.json() // { connectionId, historyId? }
  await mailQueue.add('fetch-updates', { connectionId: msg.connectionId }, { jobId: `fetch-${msg.connectionId}-${Date.now()}` })
  return NextResponse.json({ ok: true })
}



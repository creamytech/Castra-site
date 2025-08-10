import { NextRequest, NextResponse } from 'next/server'
import { handleEvent } from '@/lib/agent/orchestrator'
import { verifyGooglePubSub } from '@/lib/webhooks/verify'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Optional: verify Pub/Sub signature if configured
    if (!verifyGooglePubSub(request)) {
      // If you require verification, enable this
      // return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
    const { userId, dealId, text, headers, threadId } = await request.json()
    if (!userId || !text) return NextResponse.json({ error: 'userId and text required' }, { status: 400 })
    const res = await handleEvent({ type: 'INBOUND_EMAIL', userId, dealId, text, headers, threadId })
    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[ingest gmail]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

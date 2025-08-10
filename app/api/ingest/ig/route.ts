import { NextRequest, NextResponse } from 'next/server'
import { handleEvent } from '@/lib/agent/orchestrator'
import { verifyInstagramSig } from '@/lib/webhooks/verify'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Subscription verification challenge from Meta/IG
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token && token === (process.env.IG_VERIFY_TOKEN || '')) {
    return new NextResponse(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'invalid challenge' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    const ok = verifyInstagramSig(process.env.IG_APP_SECRET || '', raw, request.headers.get('x-hub-signature-256'))
    if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    const { userId, dealId, text, igUserId } = JSON.parse(raw)
    if (!userId || !text) return NextResponse.json({ error: 'userId and text required' }, { status: 400 })
    const res = await handleEvent({ type: 'INBOUND_IGDM', userId, dealId, text, igUserId })
    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[ingest ig]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

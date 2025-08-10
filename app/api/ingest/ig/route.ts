import { NextRequest, NextResponse } from 'next/server'
import { handleEvent } from '@/lib/agent/orchestrator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, dealId, text, igUserId } = await request.json()
    if (!userId || !text) return NextResponse.json({ error: 'userId and text required' }, { status: 400 })
    const res = await handleEvent({ type: 'INBOUND_IGDM', userId, dealId, text, igUserId })
    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[ingest ig]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { handleEvent } from '@/lib/agent/orchestrator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, igUserId, text, dealId } = body
    if (!userId || !igUserId || !text) return NextResponse.json({ error: 'missing params' }, { status: 400 })
    const res = await handleEvent({ type: 'INBOUND_IGDM', userId, dealId, igUserId, text })
    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[ingest igdm]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

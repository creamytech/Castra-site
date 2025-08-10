// Deprecated: SDP handled via /api/voice/offer
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ error: 'Deprecated. Use /api/voice/offer' }, { status: 410 })
}

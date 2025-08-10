import { NextRequest, NextResponse } from 'next/server'
import { handleEvent } from '@/lib/agent/orchestrator'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = process.env.TWILIO_AUTH_TOKEN || ''
    const url = request.nextUrl.toString()
    const text = await request.text()
    const params = Object.fromEntries(new URLSearchParams(text))

    const signature = request.headers.get('x-twilio-signature') || ''
    const valid = twilio.validateRequest(token, signature, url, params)
    if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })

    // TODO: map to userId by 'To' number routing table; fallback demo
    const userId = params.userId || ''
    if (!userId) return NextResponse.json({ error: 'missing user mapping' }, { status: 400 })

    const res = await handleEvent({ type: 'INBOUND_SMS', userId, text: params.Body || '', from: params.From || '' })
    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[ingest sms]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

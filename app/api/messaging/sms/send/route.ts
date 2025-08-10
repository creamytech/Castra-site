import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { to, body, dealId } = await request.json()
    if (!to || !body) return NextResponse.json({ error: 'to and body required' }, { status: 400 })

    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM
    if (!sid || !token || !from) return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })

    const twilio = require('twilio')(sid, token)
    const sent = await twilio.messages.create({ from, to, body })

    if (dealId) {
      await prisma.activity.create({ data: { dealId, userId: session.user.id, kind: 'SMS', channel: 'sms', subject: null, body, meta: { to, sid: sent.sid } } })
    }

    return NextResponse.json({ success: true, sid: sent.sid })
  } catch (e: any) {
    console.error('[messaging sms send]', e)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }
}

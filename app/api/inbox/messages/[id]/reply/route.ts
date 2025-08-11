import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/agent/skills/gmail'
import { sendSMS } from '@/lib/agent/skills/sms'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { channel, draft, to, subject, dealId, threadId } = await req.json()
    if (!channel || !draft) return NextResponse.json({ error: 'channel and draft required' }, { status: 400 })

    if (channel === 'email') {
      if (!to || !subject) return NextResponse.json({ error: 'to and subject required' }, { status: 400 })
      const sent = await sendEmail(ctx.session.user.id, to, subject, draft, threadId)
      if (dealId) await prisma.activity.create({ data: { dealId, userId: ctx.session.user.id, kind: 'EMAIL', channel: 'email', subject, body: draft, meta: { messageId: sent.id } } })
      return NextResponse.json({ success: true })
    }
    if (channel === 'sms') {
      if (!to) return NextResponse.json({ error: 'to required' }, { status: 400 })
      const sent = await sendSMS(to, draft)
      if (dealId) await prisma.activity.create({ data: { dealId, userId: ctx.session.user.id, kind: 'SMS', channel: 'sms', subject: null, body: draft, meta: { sid: (sent as any).sid } } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'invalid channel' }, { status: 400 })
  } catch (e: any) {
    console.error('[inbox reply]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.message.reply' })

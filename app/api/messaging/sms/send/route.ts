import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { limit } from '@/lib/rate'
import { containsSensitiveData, isQuietHours } from '@/lib/dlp'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { to, body, dealId } = await req.json()
    const rl = await limit(`sms:${ctx.session.user.id}`, 10, '1 m')
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

    // DLP + TCPA checks
    if (containsSensitiveData(body)) return NextResponse.json({ error: 'Message blocked (sensitive content)' }, { status: 400 })
    const contact = dealId ? await prisma.deal.findFirst({ where: { id: dealId }, include: { contacts: { include: { contact: true } } } }) : null
    const target = contact?.contacts?.[0]?.contact
    if (target && target.smsConsent === false) return NextResponse.json({ error: 'No SMS consent' }, { status: 403 })
    const policy = await prisma.autonomyPolicy.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage: 'LEAD' } })
    if (policy && isQuietHours(new Date(), policy.quietStart ?? undefined, policy.quietEnd ?? undefined)) {
      return NextResponse.json({ error: 'Quiet hours in effect' }, { status: 403 })
    }
    if (!to || !body) return NextResponse.json({ error: 'to and body required' }, { status: 400 })

    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM
    if (!sid || !token || !from) return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })

    const twilio = require('twilio')(sid, token)
    const sent = await twilio.messages.create({ from, to, body })

    if (dealId) {
      await prisma.activity.create({ data: { dealId, userId: ctx.session.user.id, kind: 'SMS', channel: 'sms', subject: null, body, meta: { to, sid: sent.sid } } })
    }

    return NextResponse.json({ success: true, sid: sent.sid })
  } catch (e: any) {
    console.error('[messaging sms send]', e)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }
}, { action: 'messaging.sms.send' })

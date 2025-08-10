import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { intentRouter } from '@/lib/voice/intentRouter'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function callApi(path: string, body: any) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const txt = await res.text()
  try { return { ok: res.ok, status: res.status, json: JSON.parse(txt) } } catch { return { ok: res.ok, status: res.status, text: txt } }
}

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const userId = ctx.session.user.id
    const { transcript, confirm = false, option } = await req.json()

    const context = { } // could include stage policies, etc.
    const intent = await intentRouter({ userId, transcript, context })

    // TODO: check AutonomyPolicy here and short-circuit with confirm card
    if (!confirm) {
      // Return confirm prompt for ASK flow
      return NextResponse.json({ confirmRequired: true, action: intent.kind, summary: transcript })
    }

    let result: any = null
    if (intent.kind === 'EMAIL_SEND') {
      const payload = { dealId: intent.payload.dealId, subject: intent.payload.subject || 'Quick follow-up', body: intent.payload.body || intent.payload.text || transcript }
      result = await callApi(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/messaging/email/send`, payload)
    } else if (intent.kind === 'SMS_SEND') {
      const payload = { dealId: intent.payload.dealId, body: intent.payload.body || intent.payload.text || transcript }
      result = await callApi(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/messaging/sms/send`, payload)
    } else if (intent.kind === 'EVENT_CREATE') {
      const now = new Date(); const end = new Date(now.getTime() + 30*60000)
      const payload = { summary: 'Showing', startISO: now.toISOString(), endISO: end.toISOString() }
      result = await callApi(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/calendar/events`, payload)
    } else if (intent.kind === 'DEAL_CREATE') {
      const payload = { title: transcript, type: 'BUYER' }
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/deals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      result = { ok: res.ok, status: res.status, json: await res.json().catch(()=>({})) }
    } else if (intent.kind === 'DEAL_MOVE_STAGE') {
      const id = option?.dealId || intent.payload.dealId
      if (id) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/deals/${id}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStage: intent.payload.toStage }) })
        result = { ok: res.ok, status: res.status, json: await res.json().catch(()=>({})) }
      } else {
        return NextResponse.json({ confirmRequired: true, action: intent.kind, summary: 'Which deal should I move?', options: [] })
      }
    }

    // Log interaction
    await prisma.interaction.create({ data: { userId, orgId: ctx.orgId, channel: 'VOICE', direction: 'OUT', subject: intent.kind, meta: intent as any } })

    return NextResponse.json({ spokenText: 'Done.', result })
  } catch (e: any) {
    console.error('[voice act]', e)
    return NextResponse.json({ error: 'Failed', detail: e?.message || String(e) }, { status: 500 })
  }
}, { action: 'voice.act' })



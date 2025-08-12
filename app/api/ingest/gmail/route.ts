import { NextRequest, NextResponse } from 'next/server'
import { handleEvent } from '@/lib/agent/orchestrator'
import { prisma } from '@/lib/prisma'
import { applyInboxRules } from '@/src/ai/classifier/rules'
import { classifyLead } from '@/src/ai/classifyLead'
import { notifyUser } from '@/lib/websocket'
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
    // Classify for lead and enqueue draft if lead/potential
    const rules = applyInboxRules({ text, headers: headers || {} })
    let isLead = rules.isLead
    try {
      const llm = await classifyLead({ subject: headers?.subject || '', body: text, headers })
      isLead = typeof llm.isLead === 'boolean' ? llm.isLead : isLead
    } catch {}
    if (isLead && threadId) {
      const subject = headers?.subject ? `Re: ${headers.subject}` : 'Thanks for reaching out'
      const toEmail = (headers?.from || '').match(/<([^>]+)>/)?.[1] || undefined
      await prisma.draft.create({ data: { userId, leadId: dealId || 'email', threadId, subject, bodyText: 'Hi there,\n\nThanks for your note.', meta: { to: toEmail, headers, rules } as any } }).catch(()=>{})
      const n = await prisma.notification.create({ data: { userId, type: 'draft', title: 'Draft ready for approval', body: subject, link: '/daily-brief' } }).catch(()=>null)
      if (n) await notifyUser(userId, 'notification', { id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt })
    }
    const res = await handleEvent({ type: 'INBOUND_EMAIL', userId, dealId, text, headers, threadId })
    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[ingest gmail]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

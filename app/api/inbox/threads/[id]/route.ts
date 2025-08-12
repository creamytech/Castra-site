import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { applyInboxRules } from '@/src/ai/classifier/rules'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {

    const thread = await prisma.emailThread.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { messages: { orderBy: { date: 'asc' } }, deal: true } })
    if (thread) return NextResponse.json({ thread })

    // fallback
    // Select only needed fields
    const msgs = await prisma.message.findMany({ where: { userId: ctx.session.user.id, threadId: params.id }, orderBy: { internalDate: 'asc' }, select: { id: true, from: true, snippet: true, bodyHtml: true, bodyText: true, internalDate: true, cc: true, labels: true } })
    // attempt to fetch full bodies if missing via Gmail if we have a recent message id
    try {
      const last = msgs[msgs.length-1]
      if (last?.id) {
        // optional enhancement: fetch Gmail full bodies server-side here
      }
    } catch {}
    // Compute a lightweight status/score for immediate accuracy when opening a thread that isn't materialized yet
    const last = msgs[msgs.length-1]
    const subject = msgs[0]?.subject || ''
    const combined = `${last?.snippet || ''} ${last?.payload ? '' : ''}`
    const rules = applyInboxRules({ subject, text: combined, headers: { from: last?.from || '' } })
    const status = rules.isLead ? 'lead' : (rules.uncertainty ? 'potential' : 'follow_up')
    const score = Math.max(0, Math.min(100, rules.rulesScore + (rules.extracted.phone ? 5 : 0) + (rules.extracted.timeAsk ? 5 : 0)))
    return NextResponse.json({ thread: { id: params.id, subject, status, score, extracted: rules.extracted, reasons: rules.reasons, messages: msgs } })
  } catch (e: any) {
    console.error('[inbox thread GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.get' })

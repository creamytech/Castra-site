import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'
import { getDecryptedObject } from '@/lib/storage'
import { decodeEntities } from '@/lib/securePrisma'
import { applyInboxRules } from '@/src/ai/classifier/rules'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {

    // New secure path: look up secure Thread/Message by provider thread id
    const alt = await prisma.thread.findFirst({ where: { providerThreadId: params.id }, include: { messages: { orderBy: { receivedAt: 'asc' } } } })
    if (alt) {
      const decoded = await decodeEntities('SecureMessage', alt.messages as any)
      // Do not fetch body here; only on message open
      return NextResponse.json({ thread: { id: params.id, subject: null, messages: decoded } })
    }

    // fallback
    // Select only needed fields
    const msgs = await prisma.message.findMany({ where: { userId: ctx.session.user.id, threadId: params.id }, orderBy: { internalDate: 'asc' }, select: { id: true, from: true, snippet: true, internalDate: true, labels: true } })
    // attempt to fetch full bodies if missing via Gmail if we have a recent message id
    try {
      const last = msgs[msgs.length-1]
      if (last?.id) {
        // optional enhancement: fetch Gmail full bodies server-side here
      }
    } catch {}
    // Compute a lightweight status/score for immediate accuracy when opening a thread that isn't materialized yet
    const last = msgs[msgs.length-1]
    const subject = ''
    const combined = `${last?.snippet || ''}`
    const rules = applyInboxRules({ subject, text: combined, headers: { from: last?.from || '' } })
    const status = rules.isLead ? 'lead' : (rules.uncertainty ? 'potential' : 'follow_up')
    const score = Math.max(0, Math.min(100, rules.rulesScore + (rules.extracted.phone ? 5 : 0) + (rules.extracted.timeAsk ? 5 : 0)))
    return NextResponse.json({ thread: { id: params.id, subject, status, score, extracted: rules.extracted, reasons: rules.reasons, messages: msgs } })
  } catch (e: any) {
    console.error('[inbox thread GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.get' })

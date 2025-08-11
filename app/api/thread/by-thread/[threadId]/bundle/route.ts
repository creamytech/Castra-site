import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bundleCacheGet, bundleCacheSet } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { threadId: string } }) {
  const cached = await bundleCacheGet(params.threadId)
  if (cached) return NextResponse.json(cached)
  const lead = await prisma.lead.findFirst({ where: { threadId: params.threadId } })
  if (!lead) return NextResponse.json({ lead: null, schedule: null, draft: null })
  const draft = await prisma.draft.findFirst({ where: { leadId: lead.id, status: { in: ['queued','snoozed','approved'] } }, orderBy: { updatedAt: 'desc' } })
  const schedule = (lead as any).attrs?.schedule || null
  // Fetch the latest classification snapshot from EmailThread
  const emailThread = await prisma.emailThread.findUnique({ where: { id: lead.threadId || '' } })
  const confidence = emailThread ? ({ overall: (typeof emailThread.score === 'number' ? Math.min(0.99, Math.max(0.01, emailThread.score / 100)) : 0.6), reasons: Array.isArray(emailThread.reasons) ? emailThread.reasons : (emailThread.reasons ? [emailThread.reasons] : []) }) : null
  const payload = { lead: { ...lead, status: emailThread?.status, score: emailThread?.score, priority: undefined, reasons: emailThread?.reasons, extracted: emailThread?.extracted }, schedule, draft, confidence }
  await bundleCacheSet(params.threadId, payload)
  return NextResponse.json(payload)
}



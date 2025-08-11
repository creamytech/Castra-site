import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { bundleCacheGet, bundleCacheSet } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx, params }: any) => {
  try {
    const leadId = params.leadId as string
    const cacheKey = `leadBundle:${leadId}`
    const cached = await bundleCacheGet(cacheKey)
    if (cached) return NextResponse.json(cached)

    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: ctx.session.user.id } })
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const draft = await prisma.draft.findFirst({ where: { userId: ctx.session.user.id, leadId: lead.id, status: { in: ['queued','snoozed','approved'] } }, orderBy: { updatedAt: 'desc' } })
    const schedule = (lead as any).attrs?.schedule || null
    const emailThread = lead.threadId ? await prisma.emailThread.findUnique({ where: { id: lead.threadId } }) : null
    const confidence = emailThread ? ({ overall: (typeof emailThread.score === 'number' ? Math.min(0.99, Math.max(0.01, emailThread.score / 100)) : 0.6), reasons: Array.isArray(emailThread.reasons) ? emailThread.reasons : (emailThread.reasons ? [emailThread.reasons] : []) }) : null
    const payload = { lead: { ...lead, status: (emailThread as any)?.status, score: (emailThread as any)?.score, reasons: (emailThread as any)?.reasons, extracted: (emailThread as any)?.extracted }, schedule, draft, confidence }
    await bundleCacheSet(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
})



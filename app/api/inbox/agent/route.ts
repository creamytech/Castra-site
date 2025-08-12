import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Suggestion =
  | { type: 'open'; threadId: string; subject: string | null; score?: number; preview?: string }
  | { type: 'filter'; label: string; filters: any }

function parseQuery(q: string) {
  const lower = q.toLowerCase()
  const res: any = {}
  if (/hot|high|score/.test(lower)) {
    const m = lower.match(/(>=|>\s*)?(\d{2,3})/)
    const n = m ? Number(m[2]) : 80
    res.minScore = Math.max(0, Math.min(100, n))
  }
  if (/unread/.test(lower)) res.unreadOnly = true
  if (/attach|file/.test(lower)) res.hasAttachment = true
  if (/phone/.test(lower)) res.hasPhone = true
  if (/price|budget/.test(lower)) res.hasPrice = true
  const bySubject = lower.replace(/hot|leads|find|unread|attach|file|phone|price|budget|with|over|>=|>|score|and|the|show|me|threads|emails/g, '').trim()
  if (bySubject && bySubject.length >= 3) res.q = bySubject
  return res
}

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json().catch(() => ({}))
    const query: string = String(body.query || '').trim()
    const filters = body.filters || parseQuery(query)

    const where: any = { userId: ctx.session.user.id, orgId: ctx.orgId }
    if (typeof filters.minScore === 'number') where.score = { gte: filters.minScore }
    if (filters.q) where.subject = { contains: filters.q, mode: 'insensitive' }
    // unread/attachments are derived from latest message labels
    const threads = await prisma.emailThread.findMany({
      where,
      orderBy: { lastSyncedAt: 'desc' },
      take: 50,
      include: { messages: { select: { id: true, date: true, snippet: true, internalRefs: true }, orderBy: { date: 'desc' }, take: 1 } }
    })

    let rows = threads.map((t: any) => {
      const last = t.messages?.[0]
      const labelIds = (last?.internalRefs as any)?.labelIds || []
      const unread = Array.isArray(labelIds) ? labelIds.includes('UNREAD') : false
      const hasAttachment = Array.isArray(labelIds) ? labelIds.includes('HAS_ATTACHMENT') : false
      return { id: t.id, subject: t.subject, score: t.score ?? 0, preview: last?.snippet || '', unread, hasAttachment }
    })
    if (filters.unreadOnly) rows = rows.filter(r => r.unread)
    if (filters.hasAttachment) rows = rows.filter(r => r.hasAttachment)

    // Rank by score desc then recency
    rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    const suggestions: Suggestion[] = []
    // Top opens
    for (const r of rows.slice(0, 5)) {
      suggestions.push({ type: 'open', threadId: r.id, subject: r.subject, score: r.score, preview: r.preview })
    }
    // Matching filter suggestion
    suggestions.push({ type: 'filter', label: 'Apply filters', filters })

    return NextResponse.json({ success: true, suggestions })
  } catch (e: any) {
    console.error('[inbox agent]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.agent' })



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { prompt } = await req.json().catch(()=>({})) as { prompt?: string }
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    if (!openai) return NextResponse.json({ error: 'LLM not configured' }, { status: 500 })

    // Fetch recent threads/messages for grounding
    const recent = await prisma.emailMessage.findMany({ where: { userId: ctx.session.user.id }, orderBy: { internalDate: 'desc' }, take: 50 })
    const condensed = recent.map(m => ({ id: m.id, threadId: m.threadId, from: m.from, subject: m.subject, snippet: m.snippet, date: m.internalDate }))

    const system = `You are an AI assistant with access to a recent snapshot of the user's email inbox (Gmail). Your job is to:
1) Answer questions about emails (who said what, when, subjects).
2) Find relevant threads and return links in the form /dashboard/inbox?threadId=<threadId> (or /dashboard/inbox/<threadId> if applicable).
3) If the user asks to draft a reply, propose a short reply in plain text.
Constraints: Only use the provided snapshot; do not claim to have read full contents if only snippet is given.`
    const user = `User prompt: ${prompt}
Recent messages (JSON): ${JSON.stringify(condensed)}`
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({ model, temperature: 0.2, messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ] })
    const content = completion.choices[0]?.message?.content || ''
    return NextResponse.json({ content })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
})

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { applyInboxRules } from '@/src/ai/classifier/rules'

export const dynamic = 'force-dynamic'

type Suggestion =
  | { type: 'open'; threadId: string; subject: string | null; score?: number; preview?: string }
  | { type: 'filter'; label: string; filters: any }
  | { type: 'draft'; threadId: string; messageId: string }

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
      return { id: t.id, subject: t.subject, score: t.score ?? 0, preview: last?.snippet || '', unread, hasAttachment, lastId: last?.id }
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

    // Draft intent
    if (/draft|follow\s?-?up|reply/.test(query.toLowerCase())) {
      const target = rows[0]
      if (target?.lastId) suggestions.unshift({ type: 'draft', threadId: target.id, messageId: target.lastId })
    }

    // Fallback: if no EmailThread rows matched, derive from Message for recency and score via rules
    if (suggestions.length <= 1) {
      const msgs = await prisma.message.findMany({ where: { userId: ctx.session.user.id }, orderBy: { internalDate: 'desc' }, take: 100 })
      const derived = msgs.map((m: any) => {
        const rules = applyInboxRules({ subject: m.subject || '', text: m.snippet || '', headers: { from: m.from || '' } })
        const score = Math.max(0, Math.min(100, rules.rulesScore + (rules.extracted.phone ? 5 : 0) + (rules.extracted.timeAsk ? 5 : 0)))
        const unread = Array.isArray(m.labels) ? m.labels.includes('UNREAD') : false
        return { id: m.threadId, subject: m.subject, score, preview: m.snippet, unread, hasAttachment: false, lastId: m.id }
      })
      let rows2 = derived
      if (typeof filters.minScore === 'number') rows2 = rows2.filter(r => (r.score ?? 0) >= filters.minScore)
      if (filters.unreadOnly) rows2 = rows2.filter(r => r.unread)
      rows2.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      for (const r of rows2.slice(0, 5)) {
        suggestions.push({ type: 'open', threadId: r.id, subject: r.subject, score: r.score, preview: r.preview })
      }
      if (/draft|follow\s?-?up|reply/.test(query.toLowerCase())) {
        const target = rows2[0]
        if (target?.lastId) suggestions.unshift({ type: 'draft', threadId: target.id, messageId: target.lastId })
      }
    }

    return NextResponse.json({ success: true, suggestions })
  } catch (e: any) {
    console.error('[inbox agent]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.agent' })



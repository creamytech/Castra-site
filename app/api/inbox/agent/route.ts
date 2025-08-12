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

    // Define tool functions
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'search_threads',
          description: 'Search recent inbox for messages or threads related to a query and return thread links',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'draft_reply',
          description: 'Draft a reply for the latest message in a thread',
          parameters: {
            type: 'object',
            properties: {
              threadId: { type: 'string' },
              tone: { type: 'string' }
            },
            required: ['threadId']
          }
        }
      }
    ]

    // Tool executors
    async function callTool(name: string, args: any) {
      switch (name) {
        case 'search_threads': {
          const q = String(args?.query || '').toLowerCase()
          const lim = Math.min(Number(args?.limit || 10), 25)
          const msgs = await prisma.emailMessage.findMany({ where: { userId: ctx.session.user.id }, orderBy: { date: 'desc' }, take: 200 })
          const seen = new Set<string>()
          const hits: any[] = []
          for (const m of msgs) {
            const hay = `${m.subject || ''} ${m.snippet || ''} ${m.bodyText || ''}`.toLowerCase()
            if (!q || hay.includes(q)) {
              if (!seen.has(m.threadId)) {
                seen.add(m.threadId)
                hits.push({ threadId: m.threadId, subject: m.subject, from: m.from, date: m.date, snippet: m.snippet, link: `/dashboard/inbox/${m.threadId}` })
                if (hits.length >= lim) break
              }
            }
          }
          return { results: hits }
        }
        case 'draft_reply': {
          const threadId = String(args?.threadId || '')
          const tone = String(args?.tone || 'friendly')
          const last = await prisma.emailMessage.findFirst({ where: { userId: ctx.session.user.id, threadId }, orderBy: { date: 'desc' } })
          if (!last) return { error: 'No messages found for thread' }
          const system = `You are an expert real-estate assistant. Draft a concise reply in the requested tone (${tone}).`
          const user = `Original message from ${last.from} on ${last.date?.toISOString?.() || ''}:
${last.bodyText || last.snippet || ''}

Return only the email body in plain text.`
          const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
          const c = await openai!.chat.completions.create({ model, temperature: 0.2, messages: [ { role: 'system', content: system }, { role: 'user', content: user } ] })
          const body = c.choices[0]?.message?.content?.trim() || ''
          return { draft: body, subject: 'Re: ' + (last.subject || '') }
        }
        default:
          return { error: 'unknown tool' }
      }
    }

    // Initial grounding context
    const recent = await prisma.emailMessage.findMany({ where: { userId: ctx.session.user.id }, orderBy: { date: 'desc' }, take: 30 })
    const condensed = recent.map(m => ({ id: m.id, threadId: m.threadId, from: m.from, subject: m.subject, snippet: m.snippet, date: m.date }))
    const system = `You are an AI assistant with access to a recent snapshot of the user's inbox. You may call tools to search and draft replies. Always include direct thread links when referencing a thread.`
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: `Prompt: ${prompt}\nRecent messages: ${JSON.stringify(condensed)}` },
    ]
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    let resp = await openai.chat.completions.create({ model, temperature: 0.2, tools, tool_choice: 'auto', messages })
    const msg = resp.choices[0]?.message
    if (msg?.tool_calls && msg.tool_calls.length) {
      messages.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls as any })
      for (const tc of msg.tool_calls) {
        const toolResult = await callTool(tc.function.name, JSON.parse(tc.function.arguments || '{}'))
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) } as any)
      }
      resp = await openai.chat.completions.create({ model, temperature: 0.2, tools, messages })
    }
    const content = resp.choices[0]?.message?.content || 'Done.'
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



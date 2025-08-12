import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'
import { getDecryptedObject } from '@/lib/storage'
import { logAudit } from '@/lib/audit/log'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx, req }) => {
  try {
    const messageId = req.nextUrl.searchParams.get('messageId') || ''
    const msg = await prisma.secureMessage.findUnique({ where: { id: messageId } })
    if (!msg?.bodyRef) return NextResponse.json({ body: null })
    const buf = await getDecryptedObject(msg.bodyRef)
    await logAudit({ orgId: ctx.orgId, userId: ctx.session.user.id, action: 'DECRYPT', target: `message:${messageId}` })
    return NextResponse.json({ body: buf.toString('utf8') })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.message.get' })

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
    const callTool = async (name: string, args: any) => {
      if (name === 'search_threads') {
        const q = String(args?.query || '').toLowerCase()
        const lim = Math.min(Number(args?.limit || 10), 25)
        const msgs = await prisma.emailMessage.findMany({ where: { userId: ctx.session.user.id }, orderBy: { date: 'desc' }, take: 200, select: { id: true, threadId: true, from: true, date: true, snippet: true, bodyText: true } })
        const seen = new Set<string>()
        const hits: any[] = []
        for (const m of msgs) {
          const hay = `${m.snippet || ''} ${m.bodyText || ''}`.toLowerCase()
          if (!q || hay.includes(q)) {
            if (!seen.has(m.threadId)) {
              seen.add(m.threadId)
              hits.push({ threadId: m.threadId, from: m.from, date: m.date, snippet: m.snippet, link: `/dashboard/inbox/${m.threadId}` })
              if (hits.length >= lim) break
            }
          }
        }
        return { results: hits }
      }
      if (name === 'draft_reply') {
        const threadId = String(args?.threadId || '')
        const tone = String(args?.tone || 'friendly')
        const last = await prisma.emailMessage.findFirst({ where: { userId: ctx.session.user.id, threadId }, orderBy: { date: 'desc' }, select: { id: true, from: true, date: true, snippet: true, bodyText: true } })
        if (!last) return { error: 'No messages found for thread' }
        const system = `You are an expert real-estate assistant. Draft a concise reply in the requested tone (${tone}).`
        const user = `Original message from ${last.from} on ${last.date?.toISOString?.() || ''}:
${last.bodyText || last.snippet || ''}

Return only the email body in plain text.`
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        const c = await openai!.chat.completions.create({ model, temperature: 0.2, messages: [ { role: 'system', content: system }, { role: 'user', content: user } ] })
        const body = c.choices[0]?.message?.content?.trim() || ''
        return { draft: body, subject: 'Re:' }
      }
      return { error: 'unknown tool' }
    }

    // Initial grounding context
    const recent = await prisma.emailMessage.findMany({ where: { userId: ctx.session.user.id }, orderBy: { date: 'desc' }, take: 30, select: { id: true, threadId: true, from: true, date: true, snippet: true } })
    const condensed = recent.map(m => ({ id: m.id, threadId: m.threadId, from: m.from, snippet: m.snippet, date: m.date }))
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

// (Removed older POST route variant that conflicted with tool-calling version)



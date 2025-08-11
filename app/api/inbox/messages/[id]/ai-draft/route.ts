import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const ReplyOut = z.object({
  subject: z.string().min(3),
  body: z.string().min(20),
  slots: z.array(z.string()).optional()
})

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { tone = 'friendly' } = await req.json().catch(()=>({}))

    const msg = await prisma.emailMessage.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!openai) return NextResponse.json({ error: 'LLM not configured' }, { status: 500 })

    const system = `You are an expert real-estate assistant. Write a direct email REPLY to the user on behalf of the agent. Do not summarize. Use the requested tone (${tone}). If the message asks to tour/show/meet, propose 2-3 concrete 45-60m time windows over the next 3 days in the user's local timezone and include them in the reply. Also return a machine-readable JSON array of ISO datetimes for those proposals under key "slots". Avoid legal advice/promises.`
    const user = `Original message from ${msg.from} (date: ${msg.date?.toISOString?.() || ''}):\n\n${msg.bodyText || msg.snippet || ''}\n\nReturn JSON with keys: subject (string), body (string), slots (optional array of ISO datetimes).`
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({ model, messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], temperature: 0.2 })
    let body = completion.choices[0]?.message?.content?.trim() || ''
    // Parse JSON if the model returned structured output; otherwise, treat as plain body
    let slots: string[] | undefined
    try {
      const parsed = JSON.parse(body)
      body = parsed.body || body
      slots = Array.isArray(parsed.slots) ? parsed.slots : undefined
    } catch {}
    // Subject heuristic: reuse thread subject or a minimal prefix
    const th = await prisma.emailThread.findUnique({ where: { id: msg.threadId } })
    const subject = 'Re: ' + (th?.subject || '') || 'Re:'
    const parsed = ReplyOut.safeParse({ subject, body, slots })
    if (!parsed.success) return NextResponse.json({ error: 'LLM failed' }, { status: 500 })
    return NextResponse.json({ draft: parsed.data.body, subject: parsed.data.subject, slots: parsed.data.slots })
  } catch (e: any) {
    console.error('[inbox ai-draft]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.message.ai-draft' })

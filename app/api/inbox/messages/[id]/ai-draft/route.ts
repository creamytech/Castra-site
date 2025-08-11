import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const ReplyOut = z.object({
  subject: z.string().min(3),
  body: z.string().min(20)
})

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { tone = 'friendly' } = await req.json().catch(()=>({}))

    const msg = await prisma.emailMessage.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!openai) return NextResponse.json({ error: 'LLM not configured' }, { status: 500 })

    const system = `You are an expert real-estate assistant. Write a direct email REPLY to the user on behalf of the agent. Do not summarize. Use the requested tone (${tone}). Keep it concise, propose next steps or times if appropriate, and avoid legal advice or promises.`
    const user = `Original message from ${msg.from} (date: ${msg.date?.toISOString?.() || ''}):\n\n${msg.bodyText || msg.snippet || ''}`
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({ model, messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], temperature: 0.3 })
    const body = completion.choices[0]?.message?.content?.trim() || ''
    // Subject heuristic: reuse thread subject or a minimal prefix
    const th = await prisma.emailThread.findUnique({ where: { id: msg.threadId } })
    const subject = 'Re: ' + (th?.subject || '') || 'Re:'
    const parsed = ReplyOut.safeParse({ subject, body })
    if (!parsed.success) return NextResponse.json({ error: 'LLM failed' }, { status: 500 })
    return NextResponse.json({ draft: parsed.data.body, subject: parsed.data.subject })
  } catch (e: any) {
    console.error('[inbox ai-draft]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.message.ai-draft' })

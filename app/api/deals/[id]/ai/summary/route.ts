import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, include: { contacts: { include: { contact: true } }, activities: { orderBy: { occurredAt: 'desc' }, take: 50 } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })

    const system = `You are an assistant for real estate agents. Be concise and actionable.`
    const payload = {
      deal: { title: deal.title, stage: deal.stage, type: deal.type, city: deal.city || undefined, priceTarget: deal.priceTarget || undefined },
      contacts: deal.contacts.map(dc => ({ name: `${dc.contact.firstName || ''} ${dc.contact.lastName || ''}`.trim(), role: dc.role || undefined, email: dc.contact.email || undefined, phone: dc.contact.phone || undefined })),
      activities: deal.activities.map(a => ({ kind: a.kind, channel: a.channel || undefined, subject: a.subject || undefined, body: a.body || undefined, occurredAt: a.occurredAt.toISOString() }))
    }

    const userPrompt = `Summarize this deal in <=150 words with: who, goal, status, risks/blockers, and recommended next 3 actions. Return JSON: { summary, lastTouch: {when, channel}, nextActions: string[] }. DATA: ${JSON.stringify(payload).slice(0, 100000)}`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [ { role: 'system', content: system }, { role: 'user', content: userPrompt } ],
      temperature: 0.2,
      max_tokens: 400
    })

    const content = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content, lastTouch: null, nextActions: [] }

    await prisma.activity.create({ data: { dealId: deal.id, userId: session.user.id, kind: 'AI_SUMMARY', channel: 'ai', subject: 'AI Summary', body: data.summary, meta: data } })

    return NextResponse.json({ success: true, ...data })
  } catch (e: any) {
    console.error('[deal ai summary]', e)
    return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 })
  }
}

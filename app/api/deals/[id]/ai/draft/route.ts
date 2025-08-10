import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {

    const { channel, tone = 'friendly', goal = 'follow up' } = await req.json()
    if (!channel) return NextResponse.json({ error: 'channel required' }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { contacts: { include: { contact: true } }, activities: { orderBy: { occurredAt: 'desc' }, take: 20 } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })

    const payload = {
      deal: { title: deal.title, stage: deal.stage, type: deal.type, city: deal.city || undefined, priceTarget: deal.priceTarget || undefined },
      contacts: deal.contacts.map(dc => ({ name: `${dc.contact.firstName || ''} ${dc.contact.lastName || ''}`.trim(), role: dc.role || undefined, email: dc.contact.email || undefined, phone: dc.contact.phone || undefined })),
      lastActivity: deal.activities[0] || null,
      channel, tone, goal
    }

    const system = `You draft ${channel.toUpperCase()} messages for real estate agents. Tone: ${tone}. Be concise and professional; include clear next step.`
    const userPrompt = `Draft a ${channel} message to achieve: ${goal}. Context: ${JSON.stringify(payload).slice(0, 10000)}`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [ { role: 'system', content: system }, { role: 'user', content: userPrompt } ],
      temperature: 0.4,
      max_tokens: 300
    })

    const draft = completion.choices[0]?.message?.content || ''
    return NextResponse.json({ success: true, draft })
  } catch (e: any) {
    console.error('[deal ai draft]', e)
    return NextResponse.json({ error: 'Failed to draft' }, { status: 500 })
  }
}, { action: 'deal.ai.draft' })

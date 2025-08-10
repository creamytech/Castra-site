import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import OpenAI from 'openai'
import { createCalendarEvent } from '@/lib/google'

export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const ExtractSchema = z.object({ messageId: z.string() })
const ApproveSchema = z.object({ id: z.string(), action: z.enum(['create', 'dismiss']) })

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId') || undefined

    const where: any = { userId: session.user.id, status: { in: ['suggested'] } }
    if (messageId) where.messageId = messageId

    const suggestions = await prisma.eventSuggestion.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 })
    return NextResponse.json({ success: true, suggestions })
  } catch (e: any) {
    console.error('[calendar-suggestions GET]', e)
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = ExtractSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const message = await prisma.message.findFirst({ where: { id: parsed.data.messageId, userId: session.user.id } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })

    const prompt = `Extract a calendar event from this email. Respond as JSON with keys: summary, description, startISO (RFC3339 with timezone), endISO, timeZone, location, attendees (array of emails). Email:
From: ${message.from}
Subject: ${message.subject}
Content: ${message.snippet}`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You extract calendar events with precise RFC3339 times and timezone offsets.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 400
    })

    const content = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    const attendees = Array.isArray(data.attendees) ? data.attendees.map((a: any) => (typeof a === 'string' ? a : a.email)).filter(Boolean) : []

    const suggestion = await prisma.eventSuggestion.create({
      data: {
        userId: session.user.id,
        messageId: message.id,
        summary: data.summary || 'Meeting',
        description: data.description || null,
        startISO: data.startISO,
        endISO: data.endISO,
        timeZone: data.timeZone || 'America/New_York',
        attendees,
        location: data.location || null,
        status: 'suggested'
      }
    })

    await prisma.notification.create({ data: {
      userId: session.user.id,
      type: 'calendar-suggestion',
      title: 'New calendar suggestion',
      body: suggestion.summary,
      link: `/dashboard/inbox/${message.id}`
    }})

    return NextResponse.json({ success: true, suggestion })
  } catch (e: any) {
    console.error('[calendar-suggestions POST]', e)
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = ApproveSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const suggestion = await prisma.eventSuggestion.findFirst({ where: { id: parsed.data.id, userId: session.user.id } })
    if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })

    if (parsed.data.action === 'dismiss') {
      await prisma.eventSuggestion.update({ where: { id: suggestion.id }, data: { status: 'dismissed' } })
      return NextResponse.json({ success: true })
    }

    // Create calendar event
    const event = await createCalendarEvent(session.user.id, {
      summary: suggestion.summary,
      description: suggestion.description || undefined,
      location: suggestion.location || undefined,
      startISO: suggestion.startISO,
      endISO: suggestion.endISO,
      timeZone: suggestion.timeZone,
      attendees: suggestion.attendees.map(e => ({ email: e }))
    })

    await prisma.eventSuggestion.update({ where: { id: suggestion.id }, data: { status: 'created', createdEventId: event.id } })

    await prisma.notification.create({ data: {
      userId: session.user.id,
      type: 'calendar-created',
      title: 'Calendar event created',
      body: suggestion.summary
    }})

    return NextResponse.json({ success: true, event })
  } catch (e: any) {
    console.error('[calendar-suggestions PATCH]', e)
    return NextResponse.json({ error: 'Failed to approve suggestion' }, { status: 500 })
  }
}

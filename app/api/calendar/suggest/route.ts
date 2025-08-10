import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import OpenAI from 'openai'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export const POST = withAuth(async ({ req }) => {
  try {
    const { window, constraints } = await req.json()

    if (!window) {
      return NextResponse.json(
        { error: 'Window is required' },
        { status: 400 }
      )
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are Castra, an AI-powered realtor co-pilot. Generate 3 time slots for scheduling.

GUARDRAILS:
- Propose 2-3 times when scheduling
- Each slot should be 45-60 minutes
- Return only valid ISO datetime strings
- Consider business hours (9 AM - 6 PM)
- Avoid weekends unless specifically requested
- Format as JSON array of strings

Return exactly 3 ISO datetime strings in this format:
["2024-01-15T10:00:00Z", "2024-01-15T14:00:00Z", "2024-01-16T11:00:00Z"]`
        },
        {
          role: 'user',
          content: `Generate 3 time slots for scheduling:
Window: ${window}
Constraints: ${constraints || 'None'}

Return only the JSON array of 3 ISO datetime strings.`
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content || '[]'

    try {
      const slots = JSON.parse(content)
      if (Array.isArray(slots) && slots.length === 3) {
        return NextResponse.json({ slots })
      } else {
        throw new Error('Invalid format')
      }
    } catch (parseError) {
      // Fallback: generate basic slots if parsing fails
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      const fallbackSlots = [
        tomorrow.toISOString().split('T')[0] + 'T10:00:00Z',
        tomorrow.toISOString().split('T')[0] + 'T14:00:00Z',
        dayAfter.toISOString().split('T')[0] + 'T11:00:00Z',
      ]

      return NextResponse.json({ slots: fallbackSlots })
    }
  } catch (error) {
    console.error('Calendar suggest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { action: 'calendar.suggest' })

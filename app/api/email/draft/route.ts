import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createDraft } from '@/lib/google'
import OpenAI from 'openai'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { threadSummary, lastMessage, to, subject } = await request.json()

    if (!threadSummary || !to || !subject) {
      return NextResponse.json(
        { error: 'Thread summary, recipient, and subject are required' },
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
          content: `You are Castra, an AI-powered realtor co-pilot. Create a professional email draft.

GUARDRAILS:
- Be concise and warm
- Draft-only (never send directly)
- No legal advice
- Professional but approachable
- Use HTML formatting for better presentation

Create a follow-up email based on the thread summary and last message.`,
        },
        {
          role: 'user',
          content: `Thread Summary: ${threadSummary}
Last Message: ${lastMessage}
Recipient: ${to}
Subject: ${subject}

Write a professional email draft:`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const htmlContent = completion.choices[0]?.message?.content || 'Unable to generate draft'

    const draft = await createDraft(session.user.id, to, subject, htmlContent)

    return NextResponse.json({
      html: htmlContent,
      draftId: draft.id,
    })
  } catch (error) {
    console.error('Failed to create draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

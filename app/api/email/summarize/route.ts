import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getThreadDetail } from '@/lib/google'
import { getCachedThreadSummary, setCachedThreadSummary } from '@/lib/cache'
import OpenAI from 'openai'

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

    const { threadId } = await request.json()

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cachedSummary = getCachedThreadSummary(session.user.id, threadId)
    if (cachedSummary) {
      return NextResponse.json({ summary: cachedSummary, cached: true })
    }

    const thread = await getThreadDetail(session.user.id, threadId)

    const messages = thread.messages.map(msg => {
      const subject = msg.payload.headers.find(h => h.name === 'Subject')?.value || ''
      const from = msg.payload.headers.find(h => h.name === 'From')?.value || ''
      const date = msg.payload.headers.find(h => h.name === 'Date')?.value || ''
      return `From: ${from}\nSubject: ${subject}\nDate: ${date}\nContent: ${msg.snippet}`
    }).join('\n\n')

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
          content: 'You are a helpful assistant that summarizes email threads. Provide a concise 5-bullet point summary focusing on key points, decisions, and action items.'
        },
        {
          role: 'user',
          content: `Summarize this email thread:\n\n${messages}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
    })

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary'

    // Cache the summary
    setCachedThreadSummary(session.user.id, threadId, summary)

    return NextResponse.json({ summary, cached: false })
  } catch (error) {
    console.error('Failed to summarize email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

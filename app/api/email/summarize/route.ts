import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getThreadDetail, extractPlainAndHtml } from '@/lib/google'
import { getCachedThreadSummary, setCachedThreadSummary } from '@/lib/cache'
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

    const body = await request.json().catch(() => ({}))
    const { threadId } = body

    // Validate threadId
    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json(
        { error: 'Thread ID is required and must be a string' },
        { status: 400 }
      )
    }

    // Check cache first
    const cachedSummary = getCachedThreadSummary(session.user.id, threadId)
    if (cachedSummary) {
      return NextResponse.json({ summary: cachedSummary, cached: true })
    }

    // Fetch thread details
    const thread = await getThreadDetail(session.user.id, threadId)

    if (!thread.messages || thread.messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found in thread' },
        { status: 404 }
      )
    }

    // Extract and format messages using the new helper
    const messages = thread.messages.map(msg => {
      const subject = msg.payload?.headers?.find(h => h.name === 'Subject')?.value || ''
      const from = msg.payload?.headers?.find(h => h.name === 'From')?.value || ''
      const date = msg.payload?.headers?.find(h => h.name === 'Date')?.value || ''
      
      // Use the new content extraction helper
      const { text } = extractPlainAndHtml(msg.payload)
      const content = text || msg.snippet || ''
      
      return `From: ${from}\nSubject: ${subject}\nDate: ${date}\nContent: ${content}`
    }).join('\n\n')

    // Truncate content to ~8-10k chars to avoid payload issues
    const truncatedContent = messages.slice(0, 10000)

    // Check OpenAI configuration
    if (!openai) {
      console.error('OpenAI API key not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    
    console.log(`Summarizing thread ${threadId} with ${truncatedContent.length} chars using model ${model}`)

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes email threads. Provide a concise 5-bullet point summary focusing on key points, decisions, and action items. Use bullet points (•) for clarity.'
        },
        {
          role: 'user',
          content: `Summarize this email thread:\n\n${truncatedContent}`
        }
      ],
      max_tokens: 300,
      temperature: 0.2,
    })

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary'

    // Cache the summary
    setCachedThreadSummary(session.user.id, threadId, summary)

    console.log(`Successfully summarized thread ${threadId}`)

    return NextResponse.json({ 
      summary, 
      cached: false,
      message: 'Summary generated successfully'
    })
  } catch (error: any) {
    console.error('Failed to summarize email:', error)
    
    // Return specific error messages for better debugging
    let errorMessage = 'Internal server error'
    let statusCode = 500

    if (error.message?.includes('OpenAI')) {
      errorMessage = 'OpenAI API error - check API key and model configuration'
      statusCode = 500
    } else if (error.message?.includes('thread')) {
      errorMessage = 'Thread not found or inaccessible'
      statusCode = 404
    } else if (error.message?.includes('Unauthorized')) {
      errorMessage = 'Unauthorized - check Google account connection'
      statusCode = 401
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message || 'Unknown error occurred'
      },
      { status: statusCode }
    )
  }
}

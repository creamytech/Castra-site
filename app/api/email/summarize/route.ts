import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getThreadDetail, extractPlainAndHtml } from '@/lib/google'
import { getCachedThreadSummary, setCachedThreadSummary } from '@/lib/cache'
import OpenAI from 'openai'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json().catch(() => ({}))
    const { threadId } = body

    // Validate threadId
    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json(
        { error: 'Thread ID is required and must be a string' },
        { status: 400 }
      )
    }

    // Check cache first
    const cachedSummary = getCachedThreadSummary(ctx.session.user.id, threadId)
    if (cachedSummary) {
      let parsed: any = cachedSummary
      if (typeof cachedSummary === 'string') {
        try { parsed = JSON.parse(cachedSummary) } catch { /* leave as string */ }
      }
      return NextResponse.json({ summary: parsed, cached: true })
    }

    // Fetch thread details
    const thread = await getThreadDetail(ctx.session.user.id, threadId)

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
      response_format: { type: 'json_object' } as any,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes email threads. Return only valid minified JSON with keys: tldr (1-2 sentences), keyPoints (3-8 concise bullets), actionItems (bullets phrased as actionable tasks), dates (ISO strings or natural phrases found), people (participant names/emails), sentiment (positive|neutral|negative), confidence (low|medium|high). No extra text.'
        },
        {
          role: 'user',
          content: `Summarize this email thread and return JSON only:\n\n${truncatedContent}`
        }
      ],
      max_tokens: 400,
      temperature: 0.2,
    })

    const raw = completion.choices[0]?.message?.content || ''
    let structured: any = null
    try {
      structured = JSON.parse(raw)
    } catch {
      // Fallback: wrap raw into tldr
      structured = { tldr: raw.slice(0, 500), keyPoints: [] }
    }

    // Cache the summary
    setCachedThreadSummary(ctx.session.user.id, threadId, JSON.stringify(structured))

    console.log(`Successfully summarized thread ${threadId}`)

    return NextResponse.json({ summary: structured, cached: false })
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
}, { action: 'email.summarize' })

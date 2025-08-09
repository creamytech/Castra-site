import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateChatReply } from '@/lib/llm'
import { listUpcomingEvents } from '@/lib/google'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const messages: {role: "user" | "assistant"; content: string}[] = Array.isArray(body.messages) ? body.messages : []
    
    if (messages.length === 0) {
      return NextResponse.json({ 
        message: "Hi! I'm Castra, your AI-powered realtor co-pilot. Ask me about your leads, deals, email drafts, or schedule management. How can I help you today?" 
      })
    }

    // Get additional context from email and calendar
    let contextInfo = ''
    const sessionTokens = {
      accessToken: (session as any).accessToken,
      refreshToken: (session as any).refreshToken,
    }

    try {
      // Get upcoming calendar events
      const events = await listUpcomingEvents(
        session.user.id,
        { max: 5 },
        sessionTokens
      )
      
      if (events.length > 0) {
        contextInfo += '\n\n**Upcoming Calendar Events:**\n'
        events.forEach(event => {
          const date = new Date(event.startISO || '').toLocaleString()
          contextInfo += `- ${event.summary} (${date})\n`
        })
      }
    } catch (error) {
      console.error('Failed to fetch calendar context:', error)
    }

    // Add context to the last user message
    const enhancedMessages = [...messages]
    if (enhancedMessages.length > 0 && contextInfo) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1]
      if (lastMessage.role === 'user') {
        lastMessage.content += contextInfo
      }
    }

    const reply = await generateChatReply(enhancedMessages, [], 'You are Castra, an AI-powered realtor co-pilot. You help real estate professionals manage their business efficiently.')
    
    return NextResponse.json({ message: reply })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to generate chat reply' }, 
      { status: 500 }
    )
  }
}

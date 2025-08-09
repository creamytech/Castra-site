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
        message: "Hi! I'm Castra, your AI-powered realtor co-pilot. I can help you with:\n\n• **Email Management**: Draft replies, summarize threads\n• **Calendar Events**: Create and manage appointments\n• **CRM Tasks**: Find contacts, manage leads\n• **Property Info**: Get listing details and prepare emails\n\nAsk me about your leads, deals, email drafts, or schedule management. How can I help you today?" 
      })
    }

    // Get additional context from email and calendar
    let contextInfo = ''

    try {
      // Get upcoming calendar events
      const events = await listUpcomingEvents(
        session.user.id,
        { max: 5 }
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

    // Define available tools
    const tools = [
      {
        type: "function",
        function: {
          name: "findContacts",
          description: "Search for contacts in the CRM system",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for contacts"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "findLeads",
          description: "Search for leads in the CRM system",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for leads"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "createCalendarEvent",
          description: "Create a new calendar event",
          parameters: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Event title or summary"
              },
              startTime: {
                type: "string",
                description: "Start time in ISO format or natural language (e.g., 'tomorrow at 2pm')"
              },
              endTime: {
                type: "string",
                description: "End time in ISO format or natural language (optional, defaults to 1 hour after start)"
              },
              attendees: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array of attendee email addresses"
              },
              location: {
                type: "string",
                description: "Event location (optional)"
              },
              description: {
                type: "string",
                description: "Event description (optional)"
              }
            },
            required: ["summary", "startTime"]
          }
        }
      }
    ]

    const systemPrompt = `You are Castra, an AI-powered realtor co-pilot. You help real estate professionals manage their business efficiently.

**Your Capabilities:**
- **Email Management**: Help draft replies, summarize email threads
- **Calendar Events**: Create and manage appointments, meetings, and showings
- **CRM Tasks**: Find contacts, manage leads, track deals
- **Property Info**: Get listing details and prepare marketing emails

**When creating calendar events:**
- Extract event details from natural language
- Use clear, descriptive summaries
- Include relevant attendees when mentioned
- Set appropriate durations (default 1 hour if not specified)
- Confirm the event was created successfully

**Communication Style:**
- Professional but approachable
- Concise and helpful
- Always confirm actions taken
- Provide clear next steps when appropriate

**Available Tools:**
- findContacts: Search CRM contacts
- findLeads: Search CRM leads  
- createCalendarEvent: Create calendar events

Use these tools when appropriate to help the user accomplish their tasks.`

    const reply = await generateChatReply(enhancedMessages, tools, systemPrompt)
    
    return NextResponse.json({ message: reply })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to generate chat reply' }, 
      { status: 500 }
    )
  }
}

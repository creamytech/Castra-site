import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { generateChatReply } from '@/lib/llm'
import { listUpcomingEvents } from '@/lib/google'
import { z } from 'zod'

export const POST = withAuth(async ({ req, ctx }) => {

  try {
    const body = await req.json().catch(() => ({}))
    const messages: {role: "user" | "assistant"; content: string}[] = Array.isArray(body.messages) ? body.messages : []
    
    if (messages.length === 0) {
      return NextResponse.json({ 
        message: "Hi! I'm Castra, your AI-powered realtor co-pilot. I can help you with:\n\n• **Email Management**: Draft replies, summarize threads, sync inbox\n• **Calendar Events**: Create and manage appointments\n• **CRM Tasks**: Find contacts, manage leads\n• **Property Info**: Get listing details and prepare emails\n\nAsk me about your leads, deals, email drafts, or schedule management. How can I help you today?" 
      })
    }

    // Get additional context from email and calendar
    let contextInfo = ''

    try {
      // Get upcoming calendar events
      const events = await listUpcomingEvents(
        ctx.session.user.id,
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

    // Define available tools with Zod schemas
    const functions = [
      {
        name: "create_calendar_event",
        description: "Create a new calendar event with proper validation",
        parameters: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Event title or summary"
            },
            description: {
              type: "string",
              description: "Event description (optional)"
            },
            start: {
              type: "string",
              description: "Start time in RFC3339 format (e.g., '2024-01-15T14:00:00-05:00')"
            },
            end: {
              type: "string",
              description: "End time in RFC3339 format (e.g., '2024-01-15T15:00:00-05:00')"
            },
            timeZone: {
              type: "string",
              description: "Time zone (default: America/New_York)"
            },
            attendees: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    description: "Attendee email address"
                  }
                },
                required: ["email"]
              },
              description: "Array of attendee objects with email addresses"
            },
            location: {
              type: "string",
              description: "Event location (optional)"
            }
          },
          required: ["summary", "start", "end"]
        }
      },
      {
        name: "get_recent_emails",
        description: "Get recent emails from Gmail inbox",
        parameters: {
          type: "object",
          properties: {
            q: {
              type: "string",
              description: "Search query (optional)"
            },
            limit: {
              type: "number",
              description: "Number of emails to fetch (default: 10)"
            }
          }
        }
      },
      {
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
      },
      {
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
    ]

    const systemPrompt = `You are Castra, an AI-powered realtor co-pilot. You help real estate professionals manage their business efficiently.

**Your Capabilities:**
- **Email Management**: Help draft replies, summarize email threads, sync and search inbox
- **Calendar Events**: Create and manage appointments, meetings, and showings with proper validation
- **CRM Tasks**: Find contacts, manage leads, track deals
- **Property Info**: Get listing details and prepare marketing emails

**When creating calendar events:**
- Extract event details from natural language
- Use clear, descriptive summaries
- Include relevant attendees when mentioned
- Set appropriate durations (default 1 hour if not specified)
- Use RFC3339 format for dates with timezone
- Confirm the event was created successfully

**When accessing emails:**
- Ask for user consent before accessing inbox
- Provide relevant email context when helpful
- Respect user privacy and data

**Communication Style:**
- Professional but approachable
- Concise and helpful
- Always confirm actions taken
- Provide clear next steps when appropriate
- Ask for confirmation before creating events or accessing sensitive data

**Available Functions:**
- create_calendar_event: Create calendar events with validation
- get_recent_emails: Access Gmail inbox (requires consent)
- findContacts: Search CRM contacts
- findLeads: Search CRM leads

Use these functions when appropriate to help the user accomplish their tasks. Always ask for user consent before accessing emails or creating events.`

    const reply = await generateChatReply(enhancedMessages, functions, systemPrompt)
    
    return NextResponse.json({ message: reply })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to generate chat reply' }, 
      { status: 500 }
    )
  }
}, { action: 'chat.reply' })

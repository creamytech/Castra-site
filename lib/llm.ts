import OpenAI from 'openai'
import { findContacts, findLeads, describeListing, prepareListingCoverEmail } from './tools'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// Debug: Log if OpenAI is configured
if (process.env.NODE_ENV === 'development') {
  console.log('OpenAI configured:', !!openai)
  console.log('API Key length:', process.env.OPENAI_API_KEY?.length || 0)
}

export interface GenerateReplyParams {
  threadSummary: string
  lastMessage: string
  agentProfile?: string
}

export async function generateReply({ threadSummary, lastMessage, agentProfile }: GenerateReplyParams): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const systemPrompt = `You are Castra, an AI-powered realtor co-pilot. Your communication style is:

- Concise and warm
- Draft-only (never send directly)
- No legal advice
- Propose 2-3 times when scheduling
- Return HTML tables when listing things
- Professional but approachable

${agentProfile ? `Agent Profile: ${agentProfile}` : ''}

Always respond in HTML format for better email presentation.`

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Thread Summary: ${threadSummary}\n\nLast Message: ${lastMessage}\n\nWrite a professional reply:`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || 'Unable to generate reply'
}

export async function generateChatReply(messages: any[], functions: any[], systemPrompt: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      tools: functions.map(fn => ({
        type: "function",
        function: fn
      })),
      tool_choice: 'auto',
      max_tokens: 1000,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message

    if (!response) {
      return 'Unable to generate response'
    }

    // If the model wants to call a tool, execute it
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolResults = []
      
      for (const toolCall of response.tool_calls) {
        try {
          const result = await executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments))
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: result,
          })
        } catch (error) {
          console.error(`Error executing tool ${toolCall.function.name}:`, error)
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
      }

      // Send the tool results back to the model
      const finalCompletion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages,
          response,
          ...toolResults,
        ],
        max_tokens: 1000,
        temperature: 0.7,
      })

      return finalCompletion.choices[0]?.message?.content || 'Unable to generate response'
    }

    return response.content || 'Unable to generate response'
  } catch (error) {
    console.error('Chat reply generation error:', error)
    return 'Sorry, I encountered an error while processing your request. Please try again.'
  }
}

export async function generateCalendarEventExtraction(message: string) {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const prompt = `Extract calendar event details from the following message. Return a JSON object with the following structure:
{
  "summary": "Event title/summary",
  "startTime": "ISO datetime string",
  "endTime": "ISO datetime string", 
  "duration": number in minutes,
  "attendees": ["email1@example.com", "email2@example.com"],
  "location": "optional location",
  "description": "optional description"
}

Rules:
- If no specific time is mentioned, use tomorrow at 2pm as default
- If no duration is mentioned, use 60 minutes as default
- Extract email addresses from the message for attendees
- Use natural language for summary
- Return only valid JSON

Message: "${message}"

JSON:`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a calendar event extraction assistant. Extract event details from natural language and return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response')
    }

    const eventDetails = JSON.parse(jsonMatch[0])
    
    // Validate required fields
    if (!eventDetails.summary || !eventDetails.startTime) {
      throw new Error('Missing required event details')
    }

    return eventDetails
  } catch (error) {
    console.error('Calendar event extraction error:', error)
    throw new Error('Failed to extract event details')
  }
}

async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case 'findContacts':
        return JSON.stringify(await findContacts('demo-user', args))
      case 'findLeads':
        return JSON.stringify(await findLeads('demo-user', args))
      case 'describeListing':
        return await describeListing(args)
      case 'prepareListingCoverEmail':
        const result = await prepareListingCoverEmail(args)
        return JSON.stringify(result)
      case 'create_calendar_event':
        return await createCalendarEvent(args)
      case 'book_calendar_event':
        return await bookCalendarEvent(args)
      case 'list_upcoming_events':
        return await listUpcomingEventsTool(args)
      case 'get_recent_emails':
        return await getRecentEmails(args)
      case 'gmail_list_threads': {
        const q = args?.q ? `?q=${encodeURIComponent(String(args.q))}` : ''
        const max = args?.max ? (q ? `&max=${encodeURIComponent(String(args.max))}` : `?max=${encodeURIComponent(String(args.max))}`) : ''
        const resp = await fetch(`/api/dev/gmail/threads${q}${max}`, { cache: 'no-store' })
        if (!resp.ok) throw new Error(await resp.text())
        const data = await resp.json()
        const threads = Array.isArray(data.threads) ? data.threads.slice(0, Math.min(Number(args?.max || 20), 50)) : []
        return JSON.stringify({ threads })
      }
      case 'gmail_get_thread': {
        const threadId = String(args?.threadId || '')
        if (!threadId) throw new Error('threadId required')
        const resp = await fetch(`/api/dev/gmail/thread?id=${encodeURIComponent(threadId)}`, { cache: 'no-store' })
        if (!resp.ok) throw new Error(await resp.text())
        const data = await resp.json()
        // Truncate long bodies
        if (data?.thread?.messages) {
          data.thread.messages = data.thread.messages.map((m: any) => ({ ...m, bodyText: String(m.bodyText || '').slice(0, 4000) }))
        }
        return JSON.stringify(data)
      }
      case 'calendar_list_upcoming': {
        const from = args?.from ? `from=${encodeURIComponent(String(args.from))}` : ''
        const to = args?.to ? `&to=${encodeURIComponent(String(args.to))}` : ''
        const max = args?.max ? `&max=${encodeURIComponent(String(args.max))}` : ''
        const days = args?.to || args?.from ? '' : '7'
        const url = from || to || max ? `/api/dev/calendar/upcoming?${from}${to}${max}`.replace(/\?&/, '?') : `/api/dev/calendar/upcoming?days=${days}`
        const resp = await fetch(url, { cache: 'no-store' })
        if (!resp.ok) throw new Error(await resp.text())
        const data = await resp.json()
        const events = Array.isArray(data.events) ? data.events.slice(0, Math.min(Number(args?.max || 20), 50)) : []
        return JSON.stringify({ events })
      }
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    console.error(`Error in executeTool for ${name}:`, error)
    // Return a fallback response instead of throwing
    switch (name) {
      case 'findContacts':
        return JSON.stringify([{ id: 'demo-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', tags: ['buyer'] }])
      case 'findLeads':
        return JSON.stringify([{ id: 'lead-1', status: 'hot', source: 'website', contact: { firstName: 'Jane', lastName: 'Smith' } }])
      case 'describeListing':
        return 'This is a beautiful property with great potential. Contact me for more details.'
      case 'prepareListingCoverEmail':
        return JSON.stringify({ html: '<p>Sample email content</p>', preview: true })
      case 'create_calendar_event':
        return 'Calendar event creation failed. Please try again or create the event manually.'
      case 'list_upcoming_events':
        return 'Could not read your calendar. Please reconnect Google in Settings → Profile.'
      case 'get_recent_emails':
        return 'Email access failed. Please check your Gmail connection.'
      default:
        return 'Tool execution failed'
    }
  }
}

async function createCalendarEvent(args: any): Promise<string> {
  try {
    const { summary, start, end, attendees = [], location, description, timeZone = "America/New_York" } = args
    if (!summary || !start || !end) {
      throw new Error('Missing required event details: summary, start, and end')
    }

    const response = await fetch(`/api/calendar/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ summary, description, start, end, timeZone, attendees, location })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to create calendar event')
    }

    const result = await response.json()
    return `Calendar event "${summary}" created successfully! Event ID: ${result.event.id}`
  } catch (error) {
    console.error('Calendar event creation error:', error)
    throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function bookCalendarEvent(args: any): Promise<string> {
  try {
    const { leadId, start, end } = args
    if (!leadId || !start || !end) {
      throw new Error('Missing required booking details: leadId, start, end')
    }

    const response = await fetch(`/api/schedule/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ leadId, start, end })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to book schedule')
    }

    const result = await response.json()
    return `Invite sent and event booked. Event link: ${result.event?.htmlLink || 'created'}`
  } catch (error) {
    console.error('Schedule booking error:', error)
    throw new Error(`Failed to book event: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function listUpcomingEventsTool(args: any): Promise<string> {
  try {
    const { max = 5 } = args || {}
    const resp = await fetch(`/api/calendar/upcoming?max=${encodeURIComponent(String(max))}`, { cache: 'no-store' })
    if (!resp.ok) throw new Error(await resp.text())
    const j = await resp.json()
    const events = (j.events || []) as any[]
    if (!events.length) return 'No upcoming events found.'
    const lines = events.map((e: any) => `• ${e.summary || '(no title)'} — ${new Date(e.start?.dateTime || e.start?.date || '').toLocaleString()}`)
    return `Upcoming events:\n${lines.join('\n')}`
  } catch (e: any) {
    return 'Could not read your calendar. Please reconnect Google in Settings → Profile.'
  }
}

async function getRecentEmails(args: any): Promise<string> {
  try {
    const { q = '', limit = 10 } = args
    // Prefer inbox threads API which is integrated with Gmail
    const url = `/api/inbox/threads?limit=${encodeURIComponent(String(limit))}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error(await response.text())
    const result = await response.json()
    const threads = (result.threads || []) as any[]
    if (threads.length === 0) return 'No emails found matching your search criteria.'
    const lines = threads.map((t: any) => `📧 ${t.subject || '(No subject)'} — ${t.fromName || t.fromEmail || 'Unknown'} — ${new Date(t.lastMessageAt || t.updatedAt || Date.now()).toLocaleString()}\n${t.preview || t.snippet || ''}`)
    return `Found ${threads.length} recent emails:\n\n${lines.join('\n\n')}`
  } catch (error) {
    console.error('Get recent emails error:', error)
    throw new Error(`Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

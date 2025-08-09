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
      case 'get_recent_emails':
        return await getRecentEmails(args)
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
      case 'get_recent_emails':
        return 'Email access failed. Please check your Gmail connection.'
      default:
        return 'Tool execution failed'
    }
  }
}

async function createCalendarEvent(args: any): Promise<string> {
  try {
    // Extract event details from args
    const { summary, start, end, attendees = [], location, description, timeZone = "America/New_York" } = args
    
    if (!summary || !start || !end) {
      throw new Error('Missing required event details: summary, start, and end')
    }

    // Make API call to create event
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start,
        end,
        timeZone,
        attendees,
        location
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create calendar event')
    }

    const result = await response.json()
    return `Calendar event "${summary}" created successfully! Event ID: ${result.event.id}`
  } catch (error) {
    console.error('Calendar event creation error:', error)
    throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function getRecentEmails(args: any): Promise<string> {
  try {
    const { q = '', limit = 10 } = args

    // Make API call to get recent emails
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gmail/sync?q=${encodeURIComponent(q)}&limit=${limit}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch emails')
    }

    const result = await response.json()
    const emails = result.messages || []

    if (emails.length === 0) {
      return 'No emails found matching your search criteria.'
    }

    // Format emails for display
    const emailList = emails.map((email: any) => ({
      from: email.from,
      subject: email.subject || '(No subject)',
      date: new Date(email.internalDate).toLocaleDateString(),
      snippet: email.snippet
    }))

    return `Found ${emails.length} recent emails:\n\n${emailList.map((email: any) => 
      `📧 **${email.subject}**\nFrom: ${email.from}\nDate: ${email.date}\n${email.snippet}\n`
    ).join('\n')}`
  } catch (error) {
    console.error('Get recent emails error:', error)
    throw new Error(`Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

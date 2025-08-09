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

export async function generateChatReply(messages: any[], tools: any[], systemPrompt: string): Promise<string> {
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
      tools,
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
            content: `Error executing ${toolCall.function.name}: ${error}`,
          })
        }
      }

      // Get the final response after tool execution
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
    console.error('Error in generateChatReply:', error)
    throw error
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
      default:
        return 'Tool execution failed'
    }
  }
}

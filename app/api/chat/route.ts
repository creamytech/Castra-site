import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateChatReply } from '@/lib/llm'
import {
  findContacts,
  findLeads,
  describeListing,
  prepareListingCoverEmail,
} from '@/lib/tools'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'findContacts',
          description: 'Search for contacts by tag, email, or name',
          parameters: {
            type: 'object',
            properties: {
              tag: { type: 'string', description: 'Tag to search for' },
              email: { type: 'string', description: 'Email to search for' },
              name: { type: 'string', description: 'Name to search for' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'findLeads',
          description: 'Search for leads by status, source, or date range',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Lead status to filter by' },
              source: { type: 'string', description: 'Lead source to filter by' },
              since: { type: 'string', description: 'ISO date to filter leads since' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'describeListing',
          description: 'Generate a property description for a listing',
          parameters: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Property address to describe' },
            },
            required: ['address'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'prepareListingCoverEmail',
          description: 'Prepare a listing cover email with client and property details',
          parameters: {
            type: 'object',
            properties: {
              clientName: { type: 'string', description: 'Client name for the email' },
              address: { type: 'string', description: 'Property address' },
              price: { type: 'number', description: 'Property price' },
              closeDate: { type: 'string', description: 'Close date in ISO format' },
            },
            required: ['clientName', 'address', 'price', 'closeDate'],
          },
        },
      },
    ]

    const systemPrompt = `You are Castra, an AI-powered realtor co-pilot. You help real estate professionals manage their business efficiently.

GUARDRAILS:
- Be concise and warm in tone
- Create draft emails only (never send directly)
- Never provide legal advice
- Propose 2-3 times when scheduling
- Format data in HTML tables when appropriate
- Be professional but approachable
- Use describeListing when asked to describe properties
- Use prepareListingCoverEmail when asked to prepare listing cover emails

AVAILABLE TOOLS:
- findContacts: Search user's contacts
- findLeads: Search user's leads  
- describeListing: Generate property descriptions
- prepareListingCoverEmail: Create listing cover emails

Always respond in HTML format for better presentation.`

    const response = await generateChatReply(messages, tools, systemPrompt)

    return NextResponse.json({ message: response })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { prisma } from './prisma'
import { createDraft } from './google'
import { generateReply } from './llm'
import { getListingByAddress, type ListingSpec } from './mls'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface FindContactsParams {
  tag?: string
  email?: string
  name?: string
}

export interface FindLeadsParams {
  status?: string
  source?: string
  since?: string
}

export interface DealsClosingParams {
  monthStartISO: string
  monthEndISO: string
}

export interface DraftFollowUpEmailParams {
  userId: string
  to: string
  subject: string
  threadSummary: string
  lastMessage: string
  agentProfile?: string
}

export async function findContacts(userId: string, { tag, email, name }: FindContactsParams) {
  if (!prisma) {
    throw new Error('Database not configured')
  }

  const where: any = { userId }

  if (tag) {
    where.tags = { has: tag }
  }
  if (email) {
    where.email = { contains: email, mode: 'insensitive' }
  }
  if (name) {
    where.OR = [
      { firstName: { contains: name, mode: 'insensitive' } },
      { lastName: { contains: name, mode: 'insensitive' } },
    ]
  }

  return await prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

export async function findLeads(userId: string, { status, source, since }: FindLeadsParams) {
  if (!prisma) {
    throw new Error('Database not configured')
  }

  const where: any = { userId }

  if (status) {
    where.status = status
  }
  if (source) {
    where.source = { contains: source, mode: 'insensitive' }
  }
  if (since) {
    where.createdAt = { gte: new Date(since) }
  }

  return await prisma.lead.findMany({
    where,
    include: { contact: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function dealsClosing(userId: string, monthStartISO: string, monthEndISO: string) {
  if (!prisma) {
    throw new Error('Database not configured')
  }

  return await prisma.deal.findMany({
    where: {
      userId,
      closeDate: {
        gte: new Date(monthStartISO),
        lte: new Date(monthEndISO),
      },
    },
    include: { contact: true },
    orderBy: { closeDate: 'asc' },
  })
}

export async function draftFollowUpEmail({
  userId,
  to,
  subject,
  threadSummary,
  lastMessage,
  agentProfile,
}: DraftFollowUpEmailParams) {
  const htmlContent = await generateReply({
    threadSummary,
    lastMessage,
    agentProfile,
  })

  const draft = await createDraft(userId, subject, to, htmlContent)

  return {
    draftId: draft.id,
    html: htmlContent,
  }
}

export interface DescribeListingParams {
  address: string
}

export async function describeListing({ address }: DescribeListingParams): Promise<string> {
  const listing = getListingByAddress(address)
  
  if (!listing) {
    return `I couldn't find listing information for ${address}. Please check the address and try again.`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are Castra, an AI-powered realtor co-pilot. Create a 120-180 word property description that is:

GUARDRAILS:
- Fair housing compliant (no discriminatory language)
- Friendly and welcoming tone
- Focus on property features and benefits
- Avoid assumptions about buyer preferences
- Use inclusive language
- Highlight positive aspects without exaggeration
- Professional but approachable

Write a compelling property blurb that would be suitable for MLS listings, marketing materials, or client communications.`
      },
      {
        role: 'user',
        content: `Create a property description for this listing:

Address: ${listing.address}
Price: $${listing.price.toLocaleString()}
Beds: ${listing.beds}
Baths: ${listing.baths}
Square Feet: ${listing.sqft.toLocaleString()}
Lot Size: ${listing.lotSize}
Year Built: ${listing.yearBuilt}
Property Type: ${listing.propertyType}
Style: ${listing.style}
Features: ${listing.features.join(', ')}
Current Description: ${listing.description}

Write a 120-180 word property blurb:`
      }
    ],
    max_tokens: 300,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || 'Unable to generate property description'
}

export interface PrepareListingCoverEmailParams {
  clientName: string
  address: string
  price: number
  closeDate: string
}

export async function prepareListingCoverEmail({
  clientName,
  address,
  price,
  closeDate,
}: PrepareListingCoverEmailParams): Promise<{ html: string; preview: boolean }> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/docs/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientName,
        address,
        price,
        closeDate,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to prepare document')
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw new Error(`Document preparation failed: ${error}`)
  }
}

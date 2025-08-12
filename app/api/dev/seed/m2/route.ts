import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }) => {
  const userId = ctx.session.user.id
  const samples = [
    { subject: 'Interested in touring 123 Main St this weekend', snippet: 'We saw the listing and would like to tour Saturday at 11am. Budget 900k. My number is 415-555-1212.', fromEmail: 'buyer@example.com', fromName: 'John Doe' },
    { subject: 'Newsletter September', snippet: 'Unsubscribe here. Latest updates from our vendor network...', fromEmail: 'news@vendor.com', fromName: 'Vendor News' },
    { subject: 'Request CMA for my condo', snippet: 'Thinking of listing 220 SE 2nd St. What do you think it could sell for?', fromEmail: 'owner@example.com', fromName: 'Sarah' },
    { subject: 'Vendor pitch: staging services', snippet: 'We offer premium staging packages for your listings.', fromEmail: 'sales@stagingco.com', fromName: 'Stage Co' },
    { subject: 'Rental inquiry', snippet: 'Looking for a 2 bed in downtown, budget $3k, move-in next month.', fromEmail: 'renter@example.com', fromName: 'Alex' },
  ]
  for (const s of samples) {
    await prisma.lead.create({ data: { userId, title: s.subject, description: s.snippet, source: 'seed', status: 'new', subject: s.subject, bodySnippet: s.snippet, fromEmail: s.fromEmail, fromName: s.fromName } })
  }
  return NextResponse.json({ ok: true })
}, { action: 'dev.seed.m2' })



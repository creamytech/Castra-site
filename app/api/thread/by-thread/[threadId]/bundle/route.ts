import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { threadId: string } }) {
  const lead = await prisma.lead.findFirst({ where: { threadId: params.threadId } })
  if (!lead) return NextResponse.json({ lead: null, schedule: null, draft: null })
  const draft = await prisma.draft.findFirst({ where: { leadId: lead.id, status: { in: ['queued','snoozed','approved'] } }, orderBy: { updatedAt: 'desc' } })
  const schedule = (lead as any).attrs?.schedule || null
  return NextResponse.json({ lead, schedule, draft })
}



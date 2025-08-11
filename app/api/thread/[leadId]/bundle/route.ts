import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { leadId: string } }) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } })
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const draft = await prisma.draft.findFirst({ where: { leadId: lead.id, status: { in: ['queued','snoozed','approved'] } }, orderBy: { updatedAt: 'desc' } })
  const schedule = (lead as any).attrs?.schedule || null
  return NextResponse.json({ lead, schedule, draft })
}



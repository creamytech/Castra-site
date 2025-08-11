import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bundleCacheGet, bundleCacheSet } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { threadId: string } }) {
  const cached = await bundleCacheGet(params.threadId)
  if (cached) return NextResponse.json(cached)
  const lead = await prisma.lead.findFirst({ where: { threadId: params.threadId } })
  if (!lead) return NextResponse.json({ lead: null, schedule: null, draft: null })
  const draft = await prisma.draft.findFirst({ where: { leadId: lead.id, status: { in: ['queued','snoozed','approved'] } }, orderBy: { updatedAt: 'desc' } })
  const schedule = (lead as any).attrs?.schedule || null
  const payload = { lead, schedule, draft }
  await bundleCacheSet(params.threadId, payload)
  return NextResponse.json(payload)
}



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { summarizeLead } from '@/lib/agent/skills/summarizer'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { action, payload } = await req.json()

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { leadPreference: true, activities: { orderBy: { occurredAt: 'desc' }, take: 20 } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'AI_SUGGEST_NEXT') {
      const suggestion = await summarizeLead({ deal, activities: deal.activities, prefs: deal.leadPreference })
      return NextResponse.json({ success: true, suggestion: suggestion.summary, nextActions: suggestion.nextActions })
    }

    if (action === 'EMAIL' || action === 'SMS') {
      await prisma.task.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: deal.id, type: action === 'EMAIL' ? 'DRAFT' : 'DRAFT', status: 'PENDING', payload: { channel: action.toLowerCase(), goal: payload?.goal || 'follow up' } } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('[deal quick-action POST]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'deal.quick-action' })

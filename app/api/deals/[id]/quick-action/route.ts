import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { summarizeLead } from '@/lib/agent/skills/summarizer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { action, payload } = await request.json()

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, include: { leadPreference: true, activities: { orderBy: { occurredAt: 'desc' }, take: 20 } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'AI_SUGGEST_NEXT') {
      const suggestion = await summarizeLead({ deal, activities: deal.activities, prefs: deal.leadPreference })
      return NextResponse.json({ success: true, suggestion: suggestion.summary, nextActions: suggestion.nextActions })
    }

    if (action === 'EMAIL' || action === 'SMS') {
      await prisma.task.create({ data: { userId: session.user.id, dealId: deal.id, type: action === 'EMAIL' ? 'DRAFT' : 'DRAFT', status: 'PENDING', payload: { channel: action.toLowerCase(), goal: payload?.goal || 'follow up' } } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('[deal quick-action POST]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

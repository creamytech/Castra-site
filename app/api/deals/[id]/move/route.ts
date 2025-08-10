import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { toStage } = await request.json()
    if (!ORDER.includes(toStage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, include: { contacts: { include: { contact: true } } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fromIdx = ORDER.indexOf(deal.stage as any)
    const toIdx = ORDER.indexOf(toStage)
    if (!(toIdx >= fromIdx || toStage === 'LOST')) return NextResponse.json({ error: 'Invalid stage transition' }, { status: 400 })

    await prisma.deal.update({ where: { id: deal.id }, data: { stage: toStage } })
    await prisma.activity.create({ data: { dealId: deal.id, userId: session.user.id, kind: 'NOTE', channel: 'ai', subject: `Stage moved to ${toStage}`, body: '', meta: { from: deal.stage, to: toStage } } })

    // Simple hooks
    if (toStage === 'SHOWING') {
      const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0)
      await prisma.task.create({ data: { userId: session.user.id, dealId: deal.id, type: 'DRAFT', status: 'PENDING', payload: { intent: 'post_showing', goal: 'confirm showing window' }, runAt: next } })
      await prisma.deal.update({ where: { id: deal.id }, data: { nextAction: 'Confirm showing time', nextDue: next } })
    }
    if (toStage === 'OFFER') {
      await prisma.task.create({ data: { userId: session.user.id, dealId: deal.id, type: 'DRAFT', status: 'PENDING', payload: { intent: 'offer_prep', goal: 'send offer checklist' } } })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deal move PATCH]', e)
    return NextResponse.json({ error: 'Failed to move deal' }, { status: 500 })
  }
}

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
    const { stage } = await request.json()
    if (!ORDER.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, select: { stage: true } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fromIdx = ORDER.indexOf(deal.stage as any)
    const toIdx = ORDER.indexOf(stage)
    if (!(toIdx >= fromIdx || stage === 'LOST')) return NextResponse.json({ error: 'Invalid stage transition' }, { status: 400 })

    await prisma.deal.update({ where: { id: params.id }, data: { stage } })
    await prisma.activity.create({ data: { dealId: params.id, userId: session.user.id, kind: 'NOTE', channel: 'ui', subject: `Stage moved to ${stage}`, body: '', meta: { from: deal.stage, to: stage } } })
    if (stage === 'SHOWING') {
      const next = new Date(); next.setHours(9,0,0,0)
      await prisma.deal.update({ where: { id: params.id }, data: { nextAction: 'Confirm showing time', nextDue: next } })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deal stage PATCH]', e)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}

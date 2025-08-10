import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { stage } = await req.json()
    if (!ORDER.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, select: { stage: true } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fromIdx = ORDER.indexOf(deal.stage as any)
    const toIdx = ORDER.indexOf(stage)
    if (!(toIdx >= fromIdx || stage === 'LOST')) return NextResponse.json({ error: 'Invalid stage transition' }, { status: 400 })

    await prisma.deal.update({ where: { id: params.id }, data: { stage } })
    await prisma.activity.create({ data: { dealId: params.id, userId: ctx.session.user.id, orgId: ctx.orgId, kind: 'NOTE', channel: 'ui', subject: `Stage moved to ${stage}`, body: '', meta: { from: deal.stage, to: stage } } })
    if (stage === 'SHOWING') {
      const next = new Date(); next.setHours(9,0,0,0)
      await prisma.deal.update({ where: { id: params.id }, data: { nextAction: 'Confirm showing time', nextDue: next } })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deal stage PATCH]', e)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}, { action: 'deal.stage' })

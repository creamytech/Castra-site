import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit/log'

export const dynamic = 'force-dynamic'

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
  const { toStage, expectedUpdatedAt } = await req.json()
    if (!ORDER.includes(toStage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { contacts: { include: { contact: true } } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Concurrency guard
  if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(deal.updatedAt).getTime()) {
    return NextResponse.json({ error: 'Conflict', code: 'VERSION_CONFLICT', currentUpdatedAt: deal.updatedAt }, { status: 409 })
  }

    const fromIdx = ORDER.indexOf(deal.stage as any)
    const toIdx = ORDER.indexOf(toStage)
    if (!(toIdx >= fromIdx || toStage === 'LOST')) return NextResponse.json({ error: 'Invalid stage transition' }, { status: 400 })

  // If moving to CLOSED, require value/closeReason; if to LOST require closeReason
  if (toStage === 'CLOSED' && (deal.value == null || String(deal.value) === '')) {
    return NextResponse.json({ error: 'Value required to close won' }, { status: 400 })
  }
  if ((toStage === 'CLOSED' || toStage === 'LOST') && !deal.closeReason) {
    return NextResponse.json({ error: 'Close reason required' }, { status: 400 })
  }

    const maxPos = await prisma.deal.aggregate({ _max: { position: true }, where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage: toStage } })
    const nextPos = ((maxPos._max.position ?? 0) + 100)
    const started = Date.now()
    await prisma.$transaction([
      prisma.deal.update({ where: { id: deal.id }, data: { stage: toStage, position: nextPos } }),
      prisma.activity.create({ data: { dealId: deal.id, userId: ctx.session.user.id, orgId: ctx.orgId, kind: 'NOTE', channel: 'ai', subject: `Stage moved to ${toStage}`, body: '', meta: { from: deal.stage, to: toStage } } })
    ])
    await logAudit({ orgId: ctx.orgId!, userId: ctx.session.user.id, action: 'deal_moved', target: deal.id, meta: { from: deal.stage, to: toStage, durationMs: Date.now()-started } })

    // Simple hooks
    if (toStage === 'SHOWING') {
      const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0)
      await prisma.task.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: deal.id, type: 'FOLLOW_UP', status: 'PENDING', payload: { intent: 'post_showing', goal: 'confirm showing window' }, runAt: next } })
      await prisma.deal.update({ where: { id: deal.id }, data: { nextAction: 'Confirm showing time', nextDue: next } })
    }
    if (toStage === 'OFFER') {
      await prisma.task.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: deal.id, type: 'FOLLOW_UP', status: 'PENDING', payload: { intent: 'offer_prep', goal: 'send offer checklist' } } })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deal move PATCH]', e)
    return NextResponse.json({ error: 'Failed to move deal' }, { status: 500 })
  }
}, { action: 'deal.move' })

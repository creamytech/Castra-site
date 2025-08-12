import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
  const { stage, expectedUpdatedAt, value, closeReason } = await req.json()
    if (!ORDER.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, select: { stage: true } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Concurrency guard (fetch full row)
  const full = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
  if (!full) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(full.updatedAt).getTime()) {
    return NextResponse.json({ error: 'Conflict', code: 'VERSION_CONFLICT', currentUpdatedAt: full.updatedAt }, { status: 409 })
  }

    const fromIdx = ORDER.indexOf(deal.stage as any)
    const toIdx = ORDER.indexOf(stage)
    if (!(toIdx >= fromIdx || stage === 'LOST')) return NextResponse.json({ error: 'Invalid stage transition' }, { status: 400 })

  // Enforce close requirements
  if (stage === 'CLOSED' && (value == null || String(value) === '')) {
    return NextResponse.json({ error: 'Value required to close won' }, { status: 400 })
  }
  if ((stage === 'CLOSED' || stage === 'LOST') && !closeReason) {
    return NextResponse.json({ error: 'Close reason required' }, { status: 400 })
  }

  await prisma.deal.update({ where: { id: params.id }, data: { stage, ...(value != null ? { value } : {}), ...(closeReason ? { closeReason } : {}) } })
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

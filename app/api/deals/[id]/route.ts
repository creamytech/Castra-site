import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { contacts: { include: { contact: true } }, activities: { orderBy: { occurredAt: 'desc' }, take: 50 }, emailThreads: true } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[deal GET]', e)
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
  }
}, { action: 'deal.get' })

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const body = await req.json()
    const allowed = ['title','type','stage','propertyAddr','city','state','priceTarget','mlsId','nextAction','nextDue','notes','value','closeReason','deletedAt']
    const data: any = {}
    for (const k of allowed) if (k in body) data[k] = body[k]
    const { expectedUpdatedAt } = body
    const existing = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(existing.updatedAt).getTime()) {
      return NextResponse.json({ error: 'Conflict', code: 'VERSION_CONFLICT', currentUpdatedAt: existing.updatedAt }, { status: 409 })
    }
    const updated = await prisma.deal.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, deal: updated })
  } catch (e: any) {
    console.error('[deal PATCH]', e)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}, { action: 'deal.update' })

export const DELETE = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const existing = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.deal.update({ where: { id: params.id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true, undoToken: existing.id })
  } catch (e: any) {
    console.error('[deal DELETE]', e)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}, { action: 'deal.delete' })

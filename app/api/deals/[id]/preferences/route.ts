import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  const body = await req.json()
  const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, select: { id: true } })
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const existing = await prisma.leadPreference.findFirst({ where: { dealId: deal.id } })
  const data = { priceMin: body.priceMin ?? null, priceMax: body.priceMax ?? null, beds: body.beds ?? null, baths: body.baths ?? null, neighborhoods: body.neighborhoods ?? null, timeline: body.timeline ?? null, notes: body.notes ?? null }
  const pref = existing ? await prisma.leadPreference.update({ where: { dealId: deal.id }, data }) : await prisma.leadPreference.create({ data: { dealId: deal.id, ...data } })
  return NextResponse.json({ success: true, preference: pref })
}, { action: 'deal.preferences' })

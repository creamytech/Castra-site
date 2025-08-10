import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, select: { id: true } })
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const existing = await prisma.leadPreference.findFirst({ where: { dealId: deal.id } })
  const data = { priceMin: body.priceMin ?? null, priceMax: body.priceMax ?? null, beds: body.beds ?? null, baths: body.baths ?? null, neighborhoods: body.neighborhoods ?? null, timeline: body.timeline ?? null, notes: body.notes ?? null }
  const pref = existing ? await prisma.leadPreference.update({ where: { dealId: deal.id }, data }) : await prisma.leadPreference.create({ data: { dealId: deal.id, ...data } })
  return NextResponse.json({ success: true, preference: pref })
}

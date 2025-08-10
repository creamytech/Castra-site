import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage') as any
  if (!stage) return NextResponse.json({ error: 'stage required' }, { status: 400 })
  const policy = await prisma.autonomyPolicy.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage } })
  return NextResponse.json({ policy })
}, { action: 'autonomy.get' })

export const PATCH = withAuth(async ({ req, ctx }) => {
  const body = await req.json()
  const { stage, level, quietStart, quietEnd, channelCaps } = body
  if (!stage || !level) return NextResponse.json({ error: 'stage and level required' }, { status: 400 })
  const existing = await prisma.autonomyPolicy.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage } })
  const data = { userId: ctx.session.user.id, orgId: ctx.orgId, stage, level, quietStart: quietStart ?? null, quietEnd: quietEnd ?? null, channelCaps: channelCaps ?? null }
  const policy = existing ? await prisma.autonomyPolicy.update({ where: { id: existing.id }, data }) : await prisma.autonomyPolicy.create({ data })
  return NextResponse.json({ policy })
}, { action: 'autonomy.update' })

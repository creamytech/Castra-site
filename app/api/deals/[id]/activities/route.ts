import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const items = await prisma.activity.findMany({ where: { dealId: params.id, userId: ctx.session.user.id, orgId: ctx.orgId }, orderBy: { occurredAt: 'desc' }, take: 200 })
    return NextResponse.json({ success: true, activities: items })
  } catch (e: any) {
    console.error('[activities GET]', e)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}, { action: 'deal.activities.list' })

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const body = await req.json()
    const { kind, channel, subject, body: content, meta, occurredAt } = body
    if (!kind) return NextResponse.json({ error: 'kind required' }, { status: 400 })
    const item = await prisma.activity.create({ data: { dealId: params.id, userId: ctx.session.user.id, orgId: ctx.orgId, kind, channel, subject, body: content, meta, occurredAt } })
    return NextResponse.json({ success: true, activity: item })
  } catch (e: any) {
    console.error('[activities POST]', e)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}, { action: 'deal.activities.create' })

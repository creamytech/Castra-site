import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { parseOr400, dealCreateSchema } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const stage = searchParams.get('stage') || undefined
    const q = searchParams.get('q') || ''
    const city = searchParams.get('city') || undefined
    const minPrice = parseInt(searchParams.get('minPrice') || '0') || undefined
    const maxPrice = parseInt(searchParams.get('maxPrice') || '0') || undefined
    const type = searchParams.get('type') || undefined
    const hot = searchParams.get('hot') === 'true'

    const where: any = { userId: ctx.session.user.id, orgId: ctx.orgId }
    if (stage) where.stage = stage as any
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (q) where.title = { contains: q, mode: 'insensitive' }
    if (type) where.type = type as any
    if (minPrice || maxPrice) where.priceTarget = {}
    if (minPrice) where.priceTarget.gte = minPrice
    if (maxPrice) where.priceTarget.lte = maxPrice
    if (hot) where.nextAction = { not: null }

    const [total, deals] = await Promise.all([
      prisma.deal.count({ where }),
      prisma.deal.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { contacts: { include: { contact: true } }, activities: { take: 1, orderBy: { occurredAt: 'desc' } } }
      })
    ])

    return NextResponse.json({ success: true, total, page, pageSize, deals })
  } catch (e: any) {
    console.error('[deals GET]', e)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}, { action: 'deals.list' })

export const POST = withAuth(async ({ req, ctx }) => {
  try {

    const body = parseOr400(dealCreateSchema, await req.json())
    const { title, type, stage, city, state, priceTarget, contactId } = body as any
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const deal = await prisma.deal.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, title, type, stage, city, state, priceTarget, contactId } })
    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[deals POST]', e)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}, { action: 'deals.create' })

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const stage = searchParams.get('stage') || undefined
    const q = searchParams.get('q') || ''
    const city = searchParams.get('city') || undefined
    const minPrice = parseInt(searchParams.get('minPrice') || '0') || undefined
    const maxPrice = parseInt(searchParams.get('maxPrice') || '0') || undefined

    const where: any = { userId: session.user.id }
    if (stage) where.stage = stage as any
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (q) where.title = { contains: q, mode: 'insensitive' }
    if (minPrice || maxPrice) where.priceTarget = {}
    if (minPrice) where.priceTarget.gte = minPrice
    if (maxPrice) where.priceTarget.lte = maxPrice

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
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, type, stage, city, state, priceTarget } = body
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const deal = await prisma.deal.create({ data: { userId: session.user.id, title, type, stage, city, state, priceTarget } })
    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[deals POST]', e)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}

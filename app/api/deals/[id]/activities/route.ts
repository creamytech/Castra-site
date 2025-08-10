import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await prisma.activity.findMany({ where: { dealId: params.id, userId: session.user.id }, orderBy: { occurredAt: 'desc' }, take: 200 })
    return NextResponse.json({ success: true, activities: items })
  } catch (e: any) {
    console.error('[activities GET]', e)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { kind, channel, subject, body: content, meta, occurredAt } = body
    if (!kind) return NextResponse.json({ error: 'kind required' }, { status: 400 })
    const item = await prisma.activity.create({ data: { dealId: params.id, userId: session.user.id, kind, channel, subject, body: content, meta, occurredAt } })
    return NextResponse.json({ success: true, activity: item })
  } catch (e: any) {
    console.error('[activities POST]', e)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}

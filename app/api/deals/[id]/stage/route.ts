import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { stage } = await request.json()
    if (!ORDER.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, select: { stage: true } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Simple validation: allow forward moves or to LOST
    const fromIdx = ORDER.indexOf(deal.stage as any)
    const toIdx = ORDER.indexOf(stage)
    if (!(toIdx >= fromIdx || stage === 'LOST')) return NextResponse.json({ error: 'Invalid stage transition' }, { status: 400 })

    await prisma.deal.update({ where: { id: params.id }, data: { stage } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deal stage PATCH]', e)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}

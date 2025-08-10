import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id }, include: { contacts: { include: { contact: true } }, activities: { orderBy: { occurredAt: 'desc' }, take: 50 } } })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[deal GET]', e)
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const allowed = ['title','type','stage','propertyAddr','city','state','priceTarget','mlsId','nextAction','nextDue','notes']
    const data: any = {}
    for (const k of allowed) if (k in body) data[k] = body[k]
    const updated = await prisma.deal.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, deal: updated })
  } catch (e: any) {
    console.error('[deal PATCH]', e)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await prisma.deal.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deal DELETE]', e)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}

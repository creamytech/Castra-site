import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { id } = await req.json().catch(()=>({}))
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const existing = await prisma.deal.findFirst({ where: { id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.deal.update({ where: { id }, data: { deletedAt: null } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to undo' }, { status: 500 })
  }
}, { action: 'deals.undo' })



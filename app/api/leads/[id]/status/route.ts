import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { status } = await req.json()
    if (!['lead','potential','no_lead','follow_up'].includes(status)) return NextResponse.json({ error: 'bad status' }, { status: 400 })
    const lead = await prisma.lead.update({ where: { id: params.id }, data: { status } })
    return NextResponse.json({ ok: true, lead })
  } catch (e: any) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}, { action: 'leads.status' })



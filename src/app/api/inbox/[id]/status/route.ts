import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const status = (req.nextUrl.searchParams.get('status') || '').toLowerCase()
  if (!['lead', 'potential', 'no_lead', 'follow_up'].includes(status)) return NextResponse.json({ error: 'bad status' }, { status: 400 })
  const id = params.id

  const lead = await (prisma as any).lead.update({ where: { id }, data: { status, attrs: { ...(Object as any).assign({}, { locked: true }) } } })
  await (prisma as any).eventLog.create({ data: { userId: lead.userId, type: 'status_update', meta: { id, status } } })
  return NextResponse.redirect(new URL(`/leads/${id}`, req.url))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json()
  if (!['lead', 'potential', 'no_lead', 'follow_up'].includes(status)) return NextResponse.json({ error: 'bad status' }, { status: 400 })
  const id = params.id
  const lead = await (prisma as any).lead.update({ where: { id }, data: { status, attrs: { ...(Object as any).assign({}, { locked: true }) } } })
  return NextResponse.json({ ok: true, lead })
}



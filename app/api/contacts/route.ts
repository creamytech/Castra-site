import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const contacts = await prisma.contact.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, OR: [ { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ] }, take: 20 })
  return NextResponse.json({ contacts })
}, { action: 'contacts.list' })

export const POST = withAuth(async ({ req, ctx }) => {
  const { firstName, lastName, email, phone, instagram, source } = await req.json()
  const contact = await prisma.contact.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName, lastName, email, phone, notes: '', tags: source ? [source] : [] } })
  return NextResponse.json({ contact })
}, { action: 'contacts.create' })

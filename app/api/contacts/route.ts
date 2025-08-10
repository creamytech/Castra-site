import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const contacts = await prisma.contact.findMany({ where: { userId: session.user.id, OR: [ { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ] }, take: 20 })
  return NextResponse.json({ contacts })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { firstName, lastName, email, phone, instagram, source } = await request.json()
  const contact = await prisma.contact.create({ data: { userId: session.user.id, firstName, lastName, email, phone, notes: '', tags: source ? [source] : [] } })
  return NextResponse.json({ contact })
}

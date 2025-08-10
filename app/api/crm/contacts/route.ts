import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: ctx.session.user.id, orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ contacts })
  } catch (error: any) {
    console.error('CRM contacts error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to fetch contacts' }, { status: 500 })
  }
}, { action: 'crm.contacts.list' })

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { firstName, lastName, email, phone, company, title, notes, tags } = await req.json()
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }
    const contact = await prisma.contact.create({
      data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName, lastName, email, phone, company, title, notes, tags: tags || [] }
    })
    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error('CRM create contact error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create contact' }, { status: 500 })
  }
}, { action: 'crm.contacts.create' })

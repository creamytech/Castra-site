import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }, { params }: any) => {
  const lead = await prisma.lead.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  // Find or create contact
  let contactId = lead.contactId
  if (!contactId) {
    const first = (lead.fromName || '').split(' ')[0] || 'Lead'
    const last = (lead.fromName || '').split(' ').slice(1).join(' ') || ''
    const c = await prisma.contact.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName: first, lastName: last, email: lead.fromEmail || undefined } })
    contactId = c.id
  }
  // Create deal in LEAD stage
  const deal = await prisma.deal.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, contactId, leadId: lead.id, title: lead.subject || lead.title || 'New Lead', stage: 'LEAD', type: 'BUYER', priceTarget: (lead.attrs as any)?.price || undefined } as any })
  await prisma.lead.update({ where: { id: lead.id }, data: { status: 'qualified' } })
  return NextResponse.json({ deal })
}, { action: 'leads.convert' })



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { extractEntities } from '@/lib/agent/skills/nlp'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { id, gmailId, threadId } = await req.json()

    let message = null as any
    if (id) message = await prisma.message.findFirst({ where: { id, userId: ctx.session.user.id } })
    if (!message && gmailId) message = await prisma.message.findFirst({ where: { gmailId, userId: ctx.session.user.id } })
    if (!message && threadId) message = await prisma.message.findFirst({ where: { threadId, userId: ctx.session.user.id } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const text = `${message.subject}\n${message.snippet}`
    const ents = extractEntities(text)

    // derive name/email from headers if available
    let firstName = ''
    let lastName = ''
    let email = ''
    try {
      const from = message.from as string
      const match = from.match(/\"?([^\"]+)\"?\s*<([^>]+)>/)
      if (match) { const name = match[1]; [firstName, ...((name || '').split(' ').slice(1))]; const parts = (name || '').split(' '); firstName = parts[0] || ''; lastName = parts.slice(1).join(' ') || ''; email = match[2] }
    } catch {}

    const contact = await prisma.contact.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName: ents.name || firstName || 'Lead', lastName: lastName || '', email: email || undefined, phone: ents.phone || undefined, notes: '', tags: ['email'] } })

    const title = `${contact.firstName} ${contact.lastName}`.trim() + ' – ' + (ents.city ? `Buyer ${ents.city}` : 'Buyer')
    const deal = await prisma.deal.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, title, type: 'BUYER', stage: 'LEAD', city: ents.city || undefined, priceTarget: ents.priceMax || ents.priceMin || undefined, nextAction: 'Reply to lead', nextDue: new Date() } })

    await prisma.dealContact.create({ data: { dealId: deal.id, contactId: contact.id } })
    await prisma.activity.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: deal.id, kind: 'EMAIL', channel: 'email', subject: message.subject, body: message.snippet, meta: { messageId: message.id } } })

    return NextResponse.json({ success: true, deal })
  } catch (e: any) {
    console.error('[inbox extract lead]', e)
    return NextResponse.json({ error: 'Failed to extract lead' }, { status: 500 })
  }
}, { action: 'inbox.extract-lead' })

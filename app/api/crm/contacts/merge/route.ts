import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function normalizeEmail(e?: string | null) { return (e || '').trim().toLowerCase() }
function normalizePhone(p?: string | null) { return (p || '').replace(/[^0-9]/g, '') }

export const POST = withAuth(async ({ ctx, req }) => {
  const { primaryId, duplicateId } = await req.json()
  const userId = ctx.session.user.id
  const orgId = ctx.orgId
  const dup = await prisma.contact.findFirst({ where: { id: duplicateId, userId, orgId } })
  const prim = await prisma.contact.findFirst({ where: { id: primaryId, userId, orgId } })
  if (!dup || !prim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Merge fields
  await prisma.$transaction([
    prisma.deal.updateMany({ where: { contactId: dup.id, userId, orgId }, data: { contactId: prim.id } }),
    prisma.lead.updateMany({ where: { contactId: dup.id, userId, orgId }, data: { contactId: prim.id } }),
    prisma.interaction.updateMany({ where: { contactId: dup.id, userId, orgId }, data: { contactId: prim.id } }),
    prisma.contact.update({ where: { id: prim.id }, data: {
      email: prim.email || dup.email,
      phone: prim.phone || dup.phone,
      firstName: prim.firstName || dup.firstName,
      lastName: prim.lastName || dup.lastName,
      tags: Array.from(new Set([...(prim.tags||[]), ...(dup.tags||[])])),
    } }),
    prisma.contact.delete({ where: { id: dup.id } })
  ])
  return NextResponse.json({ ok: true })
}, { action: 'crm.contacts.merge' })



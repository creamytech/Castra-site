import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function normEmail(e?: string | null) { return (e || '').trim().toLowerCase() }
function normPhone(p?: string | null) { return (p || '').replace(/[^0-9]/g, '') }

export const GET = withAuth(async ({ ctx }) => {
  const contacts = await prisma.contact.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId }, select: { id: true, email: true, phone: true, firstName: true, lastName: true } })
  const byEmail = new Map<string, string[]>()
  const byPhone = new Map<string, string[]>()
  for (const c of contacts) {
    const e = normEmail(c.email)
    const p = normPhone(c.phone)
    if (e) byEmail.set(e, [...(byEmail.get(e) || []), c.id])
    if (p) byPhone.set(p, [...(byPhone.get(p) || []), c.id])
  }
  const duplicates: Array<{ key: string; ids: string[]; type: 'email'|'phone' }> = []
  byEmail.forEach((ids, k) => { if (ids.length > 1) duplicates.push({ key: k, ids, type: 'email' }) })
  byPhone.forEach((ids, k) => { if (ids.length > 1) duplicates.push({ key: k, ids, type: 'phone' }) })
  return NextResponse.json({ duplicates })
}, { action: 'crm.contacts.dedupe' })



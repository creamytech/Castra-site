import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  const rows = await prisma.deal.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId }, orderBy: { updatedAt: 'desc' }, include: { contact: true, lead: true } })
  const headers = ['id','title','stage','type','value','probability','closeDate','contact','email','leadStatus','createdAt','updatedAt']
  const csvRows = [headers.join(',')]
  for (const d of rows) {
    const contact = d.contact ? `${d.contact.firstName||''} ${d.contact.lastName||''}`.trim() : ''
    const email = d.contact?.email || ''
    const leadStatus = d.lead?.status || ''
    const cols = [d.id, d.title, d.stage, d.type, String(d.value ?? ''), String(d.probability ?? ''), d.closeDate ? d.closeDate.toISOString() : '', contact, email, leadStatus, d.createdAt.toISOString(), d.updatedAt.toISOString()]
    csvRows.push(cols.map(v => String(v).includes(',') ? '"'+String(v).replace(/"/g,'""')+'"' : String(v)).join(','))
  }
  const body = csvRows.join('\n')
  return new NextResponse(body, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="pipeline.csv"' } })
}, { action: 'reports.pipeline.csv' })



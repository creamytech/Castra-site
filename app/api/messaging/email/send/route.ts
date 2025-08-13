import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { getGmailForUser } from '@/lib/google/gmail'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { leadId, subject, body } = await req.json().catch(() => ({}))
    if (!leadId || !subject || !body) return NextResponse.json({ error: 'leadId, subject, body required' }, { status: 400 })
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: ctx.session.user.id } })
    if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 })
    const gmail = await getGmailForUser(ctx.session.user.id)

    const to = (lead as any).fromEmail || ''
    const threadId = lead.threadId || undefined
    const raw = Buffer.from([`To: ${to}`, `Subject: ${subject}`, '', body].join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const draft = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw, threadId } } })
    await gmail.users.drafts.send({ userId: 'me', requestBody: { id: draft.data.id! } })
    await prisma.draft.updateMany({ where: { userId: ctx.session.user.id, leadId: lead.id, status: 'approved' }, data: { status: 'sent' } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'email.send' })

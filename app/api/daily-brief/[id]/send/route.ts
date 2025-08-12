import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { sendReplyFromDraft } from '@/src/lib/gmail-send'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const id = params.id as string
    const { subject, bodyText } = await req.json().catch(() => ({}))
    const draft = await prisma.draft.findFirst({ where: { id, userId: ctx.session.user.id } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const toEmail = (draft.meta as any)?.to || (draft.meta as any)?.recipient || (draft.meta as any)?.email
    if (!toEmail) return NextResponse.json({ error: 'missing recipient' }, { status: 400 })
    const sub = subject || draft.subject
    const body = bodyText || draft.bodyText

    try {
      await sendReplyFromDraft(ctx.session.user.id, draft.threadId, toEmail, sub, body)
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'send failed' }, { status: 500 })
    }

    await prisma.draft.update({ where: { id }, data: { status: 'sent' } })
    await prisma.notification.create({ data: { userId: ctx.session.user.id, type: 'draft', title: 'Draft sent', body: sub, link: `/dashboard/inbox/${draft.threadId}` } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.send' })



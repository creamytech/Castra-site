import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { threadId, leadId, subject, bodyText } = await req.json().catch(() => ({}))
    if (!threadId || !subject || !bodyText) {
      return NextResponse.json({ error: 'threadId, subject, bodyText required' }, { status: 400 })
    }

    // Try to find last email message to extract recipient (the other party)
    const last = await prisma.emailMessage.findFirst({ where: { userId: ctx.session.user.id, threadId }, orderBy: { date: 'desc' } })
    const from = last?.from || ''
    const toMatch = from.match(/<([^>]+)>/) || from.match(/([^\s@]+@[^\s@]+)/)
    const toEmail = toMatch ? toMatch[1] || toMatch[0] : undefined

    // Create queued draft for Daily Brief approval
    const draft = await prisma.draft.create({
      data: {
        userId: ctx.session.user.id,
        leadId: leadId || 'email',
        threadId,
        subject: String(subject),
        bodyText: String(bodyText),
        status: 'queued',
        meta: { to: toEmail } as any,
      }
    })

    // Notify user
    await prisma.notification.create({ data: { userId: ctx.session.user.id, type: 'draft', title: 'Draft queued for approval', body: subject, link: '/daily-brief' } }).catch(()=>{})

    return NextResponse.json({ ok: true, draft })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'drafts.create' })



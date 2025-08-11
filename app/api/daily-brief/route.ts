import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    const now = new Date()
    const drafts = await prisma.draft.findMany({
      where: {
        userId: ctx.session.user.id,
        status: { in: ['queued', 'snoozed'] },
        OR: [ { status: 'queued' }, { status: 'snoozed', snoozeUntil: { lte: now } } ]
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    })
    return NextResponse.json({ items: drafts })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.list' })

export const PATCH = withAuth(async ({ req, ctx }) => {
  try {
    const { id, action, payload } = await req.json().catch(() => ({}))
    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    const draft = await prisma.draft.findFirst({ where: { id, userId: ctx.session.user.id } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })

    if (action === 'dismiss') {
      await prisma.draft.update({ where: { id }, data: { status: 'dismissed' } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'snooze') {
      const minutes = Math.max(5, Math.min(1440, Number(payload?.minutes || 30)))
      const until = new Date(Date.now() + minutes * 60 * 1000)
      await prisma.draft.update({ where: { id }, data: { status: 'snoozed', snoozeUntil: until } })
      return NextResponse.json({ ok: true, snoozeUntil: until })
    }
    if (action === 'approve') {
      await prisma.draft.update({ where: { id }, data: { status: 'approved' } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'regenerate') {
      // Placeholder: rely on existing drafting endpoint
      return NextResponse.json({ ok: true })
    }
    if (action === 'edit') {
      const subject = String(payload?.subject || draft.subject)
      const bodyText = String(payload?.bodyText || draft.bodyText)
      await prisma.draft.update({ where: { id }, data: { subject, bodyText } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'daily-brief.update' })



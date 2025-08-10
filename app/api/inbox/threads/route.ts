import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const unread = searchParams.get('unread')
    const hasDeal = searchParams.get('hasDeal')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // First try EmailThread
    const countThreads = await prisma.emailThread.count({ where: { userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (countThreads > 0) {
      const where: any = { userId: ctx.session.user.id, orgId: ctx.orgId }
      if (q) where.subject = { contains: q, mode: 'insensitive' }
      if (hasDeal === 'true') where.dealId = { not: null }
      if (hasDeal === 'false') where.dealId = null
      // unread filter would need flags; skip for now
      const [total, rows] = await Promise.all([
        prisma.emailThread.count({ where }),
        prisma.emailThread.findMany({
          where,
          orderBy: { lastSyncedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { deal: true, messages: { select: { intent: true }, orderBy: { date: 'desc' }, take: 1 } },
        })
      ])
      const threads = rows.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        subject: t.subject,
        lastSyncedAt: t.lastSyncedAt,
        deal: t.deal || null,
        lastIntent: t.messages?.[0]?.intent || null,
      }))
      return NextResponse.json({ total, page, limit, threads })
    }

    // Fallback: group by Message.threadId
    const messages = await prisma.message.findMany({ where: { userId: ctx.session.user.id }, orderBy: { internalDate: 'desc' }, take: 500 })
    const map = new Map<string, any>()
    for (const m of messages) {
      if (q && !(m.subject?.toLowerCase().includes(q.toLowerCase()) || m.from?.toLowerCase().includes(q.toLowerCase()))) continue
      const t = map.get(m.threadId) || { id: m.threadId, userId: ctx.session.user.id, subject: m.subject, lastSyncedAt: m.internalDate, preview: m.snippet }
      if (new Date(m.internalDate) > new Date(t.lastSyncedAt)) {
        t.subject = m.subject
        t.lastSyncedAt = m.internalDate
        t.preview = m.snippet
      }
      map.set(m.threadId, t)
    }
    const all = Array.from(map.values())
    const total = all.length
    const threads = all.slice((page - 1) * limit, (page - 1) * limit + limit)
    return NextResponse.json({ total, page, limit, threads })
  } catch (e: any) {
    console.error('[inbox threads GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.threads.list' })

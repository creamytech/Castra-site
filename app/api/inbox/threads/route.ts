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
          include: { deal: true, messages: { select: { intent: true, snippet: true, bodyText: true, from: true, date: true }, orderBy: { date: 'desc' }, take: 1 } },
        })
      ])
      const mapIntentToStatus = (intent?: string | null) => {
        const i = (intent || '').toUpperCase()
        if (i.includes('OFFER')) return 'lead'
        if (i.includes('SHOWING') || i.includes('INTEREST')) return 'potential'
        if (i.includes('SPAM') || i.includes('UNSUB')) return 'no_lead'
        return 'follow_up'
      }
      const scoreFor = (status: string) => status === 'lead' ? 85 : status === 'potential' ? 70 : status === 'no_lead' ? 10 : 55
      const extract = (txt: string) => {
        const phone = (txt.match(/\b\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/) || [])[0]
        const price = (txt.match(/\b(?:\$\s?)?\d{2,3}(?:,\d{3})*(?:\s?k|\s?mm|\s?million)?\b/i) || [])[0]
        const addr = (txt.match(/\b\d+\s+[A-Za-z].+?(St|Ave|Rd|Blvd|Dr|Ln|Ct)\b/i) || [])[0]
        return { phone, price, address: addr }
      }
      const threads = rows.map((t: any) => {
        const last = t.messages?.[0]
        const status = t.status || mapIntentToStatus(last?.intent)
        const score = typeof t.score === 'number' ? t.score : scoreFor(status)
        const combined = `${last?.snippet || ''} ${last?.bodyText || ''}`
        const extracted = t.extracted || extract(combined)
        const reasons = (Array.isArray(t.reasons) ? t.reasons : [t.reasons]).filter(Boolean)
        return { id: t.id, userId: t.userId, subject: t.subject, lastSyncedAt: t.lastSyncedAt, lastMessageAt: last?.date ?? t.lastSyncedAt, deal: t.deal || null, status, score, reasons, extracted, preview: last?.snippet || last?.bodyText || '' }
      })
      return NextResponse.json({ total, page, limit, threads })
    }

    // Fallback: group by Message.threadId
    // Fallback to raw Gmail messages cache if threads not materialized
    const messages = await prisma.message.findMany({ where: { userId: ctx.session.user.id }, orderBy: { internalDate: 'desc' }, take: 200 })
    const map = new Map<string, any>()
    for (const m of messages) {
      if (q && !(m.subject?.toLowerCase().includes(q.toLowerCase()) || m.from?.toLowerCase().includes(q.toLowerCase()))) continue
      const t = map.get(m.threadId) || { id: m.threadId, userId: ctx.session.user.id, subject: m.subject, lastSyncedAt: m.internalDate, lastMessageAt: m.internalDate, preview: m.snippet }
      if (new Date(m.internalDate) > new Date(t.lastSyncedAt)) {
        t.subject = m.subject
        t.lastSyncedAt = m.internalDate
        t.lastMessageAt = m.internalDate
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

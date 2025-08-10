import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const unread = searchParams.get('unread')
    const hasDeal = searchParams.get('hasDeal')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // First try EmailThread
    const countThreads = await prisma.emailThread.count({ where: { userId: session.user.id } })
    if (countThreads > 0) {
      const where: any = { userId: session.user.id }
      if (q) where.subject = { contains: q, mode: 'insensitive' }
      if (hasDeal === 'true') where.dealId = { not: null }
      if (hasDeal === 'false') where.dealId = null
      // unread filter would need flags; skip for now
      const [total, threads] = await Promise.all([
        prisma.emailThread.count({ where }),
        prisma.emailThread.findMany({ where, orderBy: { lastSyncedAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { deal: true } })
      ])
      return NextResponse.json({ total, page, limit, threads })
    }

    // Fallback: group by Message.threadId
    const messages = await prisma.message.findMany({ where: { userId: session.user.id }, orderBy: { internalDate: 'desc' }, take: 500 })
    const map = new Map<string, any>()
    for (const m of messages) {
      if (q && !(m.subject?.toLowerCase().includes(q.toLowerCase()) || m.from?.toLowerCase().includes(q.toLowerCase()))) continue
      const t = map.get(m.threadId) || { id: m.threadId, userId: session.user.id, subject: m.subject, lastSyncedAt: m.internalDate, preview: m.snippet }
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
}

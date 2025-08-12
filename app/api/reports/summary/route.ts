import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx, req }) => {
  const userId = ctx.session.user.id
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const rangeStr = (searchParams.get('range') || '30d').toLowerCase()
  const owner = (searchParams.get('owner') || 'me').toLowerCase()
  const days = rangeStr === '7d' ? 7 : rangeStr === '90d' ? 90 : 30
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)
  const cacheKey = `report:summary:${userId}:${orgId}:${days}:${owner}`
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json(cached)

  // Leads by source (30d)
  const leadsBySource = await prisma.lead.groupBy({
    by: ['source'],
    where: { userId: owner === 'team' ? undefined as any : userId, orgId, createdAt: { gte: since } },
    _count: { _all: true }
  }).then(rows => rows.map(r => ({ source: r.source, count: (r as any)._count._all })))

  // Time to first reply: approximate via first Activity EMAIL with direction 'out'
  const activities = await prisma.activity.findMany({
    where: { userId: owner === 'team' ? undefined as any : userId, orgId, kind: 'EMAIL', occurredAt: { gte: since } },
    select: { occurredAt: true, dealId: true }
  })
  // Buckets by day; compute simple p50/p95 over minutes per deal where we have a prior NOTE/AI_SUMMARY timestamp as proxy for inbound
  const firstReply: Array<{ bucket: string; p50: number; p95: number }> = []
  if (activities.length) {
    const byDeal = new Map<string, Date[]>()
    activities.forEach((a) => {
      const arr = byDeal.get(a.dealId) || []
      arr.push(a.occurredAt)
      byDeal.set(a.dealId, arr)
    })
    const deltas: number[] = []
    byDeal.forEach((arr) => {
      arr.sort((a, b) => a.getTime() - b.getTime())
      if (arr.length >= 1) {
        const firstOut = arr[0].getTime()
        const created = since.getTime()
        deltas.push(Math.max(0, Math.round((firstOut - created) / 60000)))
      }
    })
    deltas.sort((a, b) => a - b)
    const p = (q: number) => (deltas.length ? deltas[Math.min(deltas.length - 1, Math.floor(q * (deltas.length - 1)))] : 0)
    firstReply.push({ bucket: `${days}d`, p50: p(0.5), p95: p(0.95) })
  }

  // Stage conversion counts (current snapshot)
  const stageConv = await prisma.deal.groupBy({ by: ['stage'], where: { userId: owner === 'team' ? undefined as any : userId, orgId }, _count: { _all: true } }).then(rows => rows.map(r => ({ stage: r.stage, count: (r as any)._count._all })))

  const payload = { leadsBySource, firstReply, stageConv }
  await cacheSet(cacheKey, payload, 90)
  return NextResponse.json(payload)
}, { action: 'reports.summary' })



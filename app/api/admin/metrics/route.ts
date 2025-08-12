import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { snapshotMetrics } from '@/lib/metrics'
import { pingCache, metricGet } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  try {
    // Simple health checks
    const cacheOk = await pingCache()
    await prisma.$queryRaw`SELECT 1`
    const m = snapshotMetrics()
    const gmail = {
      pubsubEvents: await metricGet('gmail.pubsub.received'),
      historyCalls: await metricGet('gmail.history.calls'),
      metaGets: await metricGet('gmail.messages.get.meta'),
      fullGets: await metricGet('gmail.messages.get.full'),
      etagHits: await metricGet('gmail.etag.hit'),
      normalized: await metricGet('gmail.messages.normalized'),
    }
    return NextResponse.json({ ok: true, db: true, cache: cacheOk, metrics: m, gmail })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'admin.metrics' })



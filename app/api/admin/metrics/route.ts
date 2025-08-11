import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { snapshotMetrics } from '@/lib/metrics'
import { pingCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  try {
    // Simple health checks
    const cacheOk = await pingCache()
    await prisma.$queryRaw`SELECT 1`
    const m = snapshotMetrics()
    return NextResponse.json({ ok: true, db: true, cache: cacheOk, metrics: m })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'admin.metrics' })



import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/api'
import { getGoogleClients } from '@/lib/google/client'
import { incrementalSync } from '@/lib/google/gmailLayer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// This route is intended for Vercel Cron. It iterates over Google accounts and advances historyId.
// Protect with a CRON_SECRET in production via withAuth or header check if needed.
export async function GET(req: NextRequest) {
  // Optional: simple header secret guard
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const limit = Number(new URL(req.url).searchParams.get('limit') || 25)
  const accounts = await prisma.account.findMany({ where: { provider: 'google' }, take: limit })
  const results: any[] = []
  for (const acc of accounts) {
    try {
      const userId = acc.userId
      const since = acc.gmailHistoryId || undefined
      if (!userId) continue
      const { threads, newHistoryId } = since ? await incrementalSync(userId, since) : { threads: [], newHistoryId: since }
      if (newHistoryId && newHistoryId !== acc.gmailHistoryId) {
        await prisma.account.update({ where: { id: acc.id }, data: { gmailHistoryId: String(newHistoryId) } })
      }
      results.push({ userId, updated: !!newHistoryId, threadCount: threads.length })
    } catch (e: any) {
      results.push({ accountId: acc.id, error: e?.message || String(e) })
    }
  }
  return NextResponse.json({ ok: true, processed: accounts.length, results })
}



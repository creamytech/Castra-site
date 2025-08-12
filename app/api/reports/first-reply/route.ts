import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx, req }) => {
  const { searchParams } = new URL(req.url)
  const days = Number(searchParams.get('days') || 30)
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)
  const userId = ctx.session.user.id
  const orgId = ctx.orgId
  // Better approximation: use EmailThread.createdAt vs first outbound EmailLog
  const threads = await prisma.emailThread.findMany({ where: { userId, orgId, lastSyncedAt: { gte: since } }, select: { id: true, createdAt: true } })
  const logs = await prisma.emailLog.findMany({ where: { userId, timestamp: { gte: since }, action: 'SENT' }, select: { threadId: true, timestamp: true } })
  const firstByThread = new Map<string, Date>()
  for (const l of logs) {
    const prev = firstByThread.get(l.threadId)
    if (!prev || l.timestamp < prev) firstByThread.set(l.threadId, l.timestamp)
  }
  const deltas: number[] = []
  for (const t of threads) {
    const first = firstByThread.get(t.id)
    if (!first) continue
    deltas.push(Math.max(0, Math.round((first.getTime() - t.createdAt.getTime()) / 60000)))
  }
  deltas.sort((a,b)=>a-b)
  const p = (q:number)=> deltas.length ? deltas[Math.min(deltas.length-1, Math.floor(q*(deltas.length-1)))] : 0
  return NextResponse.json({ days, p50: p(0.5), p90: p(0.9), p95: p(0.95) })
}, { action: 'reports.first-reply' })



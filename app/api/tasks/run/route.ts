import { NextRequest, NextResponse } from 'next/server'
import { pullDue } from '@/lib/agent/queue'
import { prisma } from '@/lib/prisma'
import { runTask } from '@/lib/agent/orchestrator'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const items = await pullDue(10)
    const results: any[] = []
    for (const item of items) {
      const dbTask = await prisma.task.findFirst({ where: { id: item.payload?.taskId || undefined } })
      const created = dbTask || await prisma.task.create({ data: { id: item.id, userId: item.payload.userId, dealId: item.payload.dealId, type: item.type, status: 'RUNNING', payload: item.payload } })
      const res = await runTask({ id: created.id, type: created.type, payload: created.payload as any, userId: created.userId, dealId: created.dealId || undefined })
      results.push({ id: created.id, res })
    }
    return NextResponse.json({ drained: items.length, results })
  } catch (e: any) {
    console.error('[tasks run]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueue } from '@/lib/agent/queue'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const users = await prisma.user.findMany({ select: { id: true } })
    const now = new Date()
    now.setHours(7, 30, 0, 0) // 7:30am local server time
    for (const u of users) {
      await enqueue('DIGEST', { userId: u.id }, now.getTime())
    }
    return NextResponse.json({ queued: users.length })
  } catch (e: any) {
    console.error('[cron digest]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

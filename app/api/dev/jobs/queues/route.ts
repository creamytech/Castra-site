import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { leadQueue } from '@/src/lib/queue'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async () => {
  const counts = await leadQueue.getJobCounts()
  return NextResponse.json({ counts })
}, { action: 'dev.jobs.queues' })



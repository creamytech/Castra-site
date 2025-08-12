import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async () => {
  const mod: any = await import('@/src/lib/queue')
  const counts = (await mod?.leadQueue?.getJobCounts?.()) || {}
  return NextResponse.json({ counts })
}, { action: 'dev.jobs.queues' })



import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req }) => {
  const { name, data } = await req.json()
  const mod: any = await import('@/src/lib/queue')
  await mod.addLeadJob(String(name), data || {}, { jobId: `dev-${name}-${Date.now()}` })
  return NextResponse.json({ queued: true })
}, { action: 'dev.jobs.run' })



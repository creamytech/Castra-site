import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { addLeadJob } from '@/src/lib/queue'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req }) => {
  const { name, data } = await req.json()
  await addLeadJob(String(name), data || {}, { jobId: `dev-${name}-${Date.now()}` })
  return NextResponse.json({ queued: true })
}, { action: 'dev.jobs.run' })



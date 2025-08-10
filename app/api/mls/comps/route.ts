import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getMlsProvider } from '@/lib/agent/skills/mls'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req }) => {
  const body = await req.json()
  const provider = getMlsProvider()
  const data = await provider.getComps(body)
  return NextResponse.json(data)
}, { action: 'mls.comps' })

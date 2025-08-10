import { NextResponse } from 'next/server'
import { getMlsProvider } from '@/lib/agent/skills/mls'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json()
  const provider = getMlsProvider()
  const data = await provider.getComps(body)
  return NextResponse.json(data)
}

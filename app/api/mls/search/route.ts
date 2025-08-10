import { NextResponse } from 'next/server'
import { getMlsProvider } from '@/lib/agent/skills/mls'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const q = await req.json()
  const provider = getMlsProvider()
  const data = await provider.searchListings(q)
  return NextResponse.json(data)
}

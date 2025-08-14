import { NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ error: 'Calendar hold API removed' }, { status: 410 })
}

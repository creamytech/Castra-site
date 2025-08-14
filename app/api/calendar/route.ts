import { NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ error: 'Calendar API removed' }, { status: 410 })
}

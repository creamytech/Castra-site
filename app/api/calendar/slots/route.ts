import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findOpenSlots } from '@/lib/agent/skills/calendar'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const slots = await findOpenSlots(session.user.id, 30)
  return NextResponse.json({ slots })
}



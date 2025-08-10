import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { findOpenSlots } from '@/lib/agent/skills/calendar'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  const slots = await findOpenSlots(ctx.session.user.id, 30)
  return NextResponse.json({ slots })
}, { action: 'calendar.slots' })



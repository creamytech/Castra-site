import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  // Expose minimal info to the client for channel naming
  return NextResponse.json({ userChannel: `private-user-${ctx.session.user.id}` })
}, { action: 'notifications.subscribe' })



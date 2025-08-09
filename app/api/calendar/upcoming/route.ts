import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUpcomingEvents } from '@/lib/google'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const max = Number(searchParams.get('max') ?? 10)
  const timeMinISO = searchParams.get('timeMinISO') ?? undefined

  try {
    const sessionTokens = {
      accessToken: (session as any).accessToken,
      refreshToken: (session as any).refreshToken,
    }

    const events = await listUpcomingEvents(
      (session.user as any).id, 
      { max, timeMinISO },
      sessionTokens
    )
    
    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Calendar upcoming events error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch calendar events' }, 
      { status: 500 }
    )
  }
}

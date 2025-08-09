import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCalendarEvent } from '@/lib/google'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { summary, startISO, endISO, attendees } = await request.json()

    if (!summary || !startISO || !endISO) {
      return NextResponse.json(
        { error: 'Summary, start time, and end time are required' },
        { status: 400 }
      )
    }

    // Pass session tokens for JWT strategy
    const sessionTokens = {
      accessToken: (session as any).accessToken,
      refreshToken: (session as any).refreshToken,
    }

    const event = await createCalendarEvent(
      session.user.id,
      summary,
      startISO,
      endISO,
      attendees || [],
      sessionTokens
    )

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check if Google account is connected and tokens are valid'
      },
      { status: 500 }
    )
  }
}

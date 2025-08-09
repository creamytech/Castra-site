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
        { error: 'Summary, startISO, and endISO are required' },
        { status: 400 }
      )
    }

    const event = await createCalendarEvent(
      session.user.id,
      summary,
      startISO,
      endISO,
      attendees || []
    )

    return NextResponse.json({
      eventId: event.id,
      summary: event.summary,
      start: event.start,
      end: event.end,
    })
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json().catch(() => ({}))
    const { summary, startISO, endISO, attendees = [], timeZone = "UTC" } = body

    // Validate required fields with helpful error messages
    if (!summary || typeof summary !== 'string') {
      return NextResponse.json(
        { error: 'Summary is required and must be a string' },
        { status: 400 }
      )
    }

    if (!startISO || typeof startISO !== 'string') {
      return NextResponse.json(
        { error: 'Start time (startISO) is required and must be a valid ISO string' },
        { status: 400 }
      )
    }

    if (!endISO || typeof endISO !== 'string') {
      return NextResponse.json(
        { error: 'End time (endISO) is required and must be a valid ISO string' },
        { status: 400 }
      )
    }

    // Validate attendees array
    if (attendees && !Array.isArray(attendees)) {
      return NextResponse.json(
        { error: 'Attendees must be an array of email strings' },
        { status: 400 }
      )
    }

    // Validate timeZone
    if (timeZone && typeof timeZone !== 'string') {
      return NextResponse.json(
        { error: 'TimeZone must be a string' },
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
      { summary, startISO, endISO, attendees, timeZone },
      sessionTokens
    )

    return NextResponse.json({
      success: true,
      eventId: event.id,
      summary: event.summary,
      start: event.start,
      end: event.end,
      message: 'Calendar hold created successfully'
    })
  } catch (error: any) {
    console.error('Failed to create calendar hold:', error)
    
    // Return specific error messages for better debugging
    const errorMessage = error.message || 'Unknown error occurred'
    const statusCode = error.code === 401 ? 401 : 
                      error.code === 403 ? 403 : 
                      error.code === 400 ? 400 : 500

    return NextResponse.json(
      { 
        error: errorMessage,
        details: statusCode === 401 ? 'Authentication failed - please reconnect your Google account' :
                 statusCode === 403 ? 'Calendar access denied - check Google Calendar permissions' :
                 statusCode === 400 ? 'Invalid event data - check date format and required fields' :
                 'Check if Google account is connected and tokens are valid'
      },
      { status: statusCode }
    )
  }
}

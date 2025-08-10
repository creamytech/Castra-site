import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { createCalendarEvent } from '@/lib/google'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json().catch(() => ({}))
    const { summary, startISO, endISO, attendees = [], timeZone = "UTC" } = body

    // Validate required fields
    if (!summary || typeof summary !== 'string') {
      return NextResponse.json(
        { error: 'Summary is required and must be a string' },
        { status: 400 }
      )
    }

    // More flexible date validation
    let validatedStartISO = startISO;
    let validatedEndISO = endISO;

    // Try to parse and validate start date
    if (!startISO || typeof startISO !== 'string') {
      return NextResponse.json(
        { error: 'Start time (startISO) is required and must be a valid ISO string' },
        { status: 400 }
      )
    }

    try {
      const startDate = new Date(startISO);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Start time must be a valid date format (ISO 8601)' },
          { status: 400 }
        )
      }
      validatedStartISO = startDate.toISOString();
    } catch (error) {
      return NextResponse.json(
        { error: 'Start time must be a valid date format (ISO 8601)' },
        { status: 400 }
      )
    }

    // Try to parse and validate end date
    if (!endISO || typeof endISO !== 'string') {
      return NextResponse.json(
        { error: 'End time (endISO) is required and must be a valid ISO string' },
        { status: 400 }
      )
    }

    try {
      const endDate = new Date(endISO);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'End time must be a valid date format (ISO 8601)' },
          { status: 400 }
        )
      }
      validatedEndISO = endDate.toISOString();
    } catch (error) {
      return NextResponse.json(
        { error: 'End time must be a valid date format (ISO 8601)' },
        { status: 400 }
      )
    }

    // Validate that start is before end
    const startDate = new Date(validatedStartISO);
    const endDate = new Date(validatedEndISO);
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
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

    const event = await createCalendarEvent(
      ctx.session.user.id,
      { summary, startISO: validatedStartISO, endISO: validatedEndISO, attendees, timeZone }
    )

    return NextResponse.json({ 
      success: true,
      event,
      message: 'Calendar event created successfully'
    })
  } catch (error: any) {
    console.error('Calendar API error:', error)
    
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
}, { action: 'calendar.create' })

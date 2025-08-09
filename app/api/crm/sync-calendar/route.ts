import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUpcomingEvents } from '@/lib/google'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sessionTokens = {
      accessToken: (session as any).accessToken,
      refreshToken: (session as any).refreshToken,
    }

    // Get upcoming calendar events
    const events = await listUpcomingEvents(
      (session.user as any).id,
      { max: 50 },
      sessionTokens
    )

    let syncedCount = 0
    const newContacts = []

    // Extract unique attendees from calendar events
    const uniqueAttendees = new Map()
    
    for (const event of events) {
      for (const attendee of event.attendees) {
        if (attendee && !uniqueAttendees.has(attendee)) {
          uniqueAttendees.set(attendee, {
            email: attendee,
            name: attendee.split('@')[0], // Basic name extraction
            source: 'calendar',
            tags: ['calendar-contact'],
            lastContact: event.startISO || new Date().toISOString(),
            emailCount: 0,
            meetingCount: 1,
            leadScore: 40, // Default score for calendar contacts
            status: 'new' as const,
            createdAt: new Date().toISOString()
          })
          syncedCount++
        } else if (uniqueAttendees.has(attendee)) {
          // Increment meeting count for existing attendee
          const existing = uniqueAttendees.get(attendee)
          existing.meetingCount++
          existing.lastContact = event.startISO || new Date().toISOString()
        }
      }
    }

    // Convert to array
    const contacts = Array.from(uniqueAttendees.values())

    return NextResponse.json({ 
      syncedCount,
      contacts 
    })
  } catch (error: any) {
    console.error('CRM sync calendar error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to sync from calendar' }, 
      { status: 500 }
    )
  }
}

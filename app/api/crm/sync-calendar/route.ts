import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUpcomingEvents } from '@/lib/google'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get upcoming calendar events
    const events = await listUpcomingEvents(
      session.user.id,
      { max: 50 }
    )

    let syncedCount = 0
    const newContacts = []

    // Extract unique attendees from calendar events
    const uniqueAttendees = new Map()
    
    for (const event of events) {
      for (const attendee of event.attendees) {
        if (attendee && !uniqueAttendees.has(attendee)) {
          // Check if contact already exists
          const existingContact = await prisma.contact.findFirst({
            where: {
              userId: session.user.id,
              email: attendee
            }
          })

          if (!existingContact) {
            // Create new contact
            const contact = await prisma.contact.create({
              data: {
                userId: session.user.id,
                firstName: attendee.split('@')[0] || 'Unknown',
                lastName: 'Contact',
                email: attendee,
                tags: ['calendar-contact'],
                notes: `Synced from calendar event "${event.summary}" on ${new Date().toLocaleDateString()}`
              }
            })
            newContacts.push(contact)
            syncedCount++
          }
          
          uniqueAttendees.set(attendee, { email: attendee })
        }
      }
    }

    return NextResponse.json({ 
      syncedCount,
      contacts: newContacts 
    })
  } catch (error: any) {
    console.error('CRM sync calendar error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to sync from calendar' }, 
      { status: 500 }
    )
  }
}

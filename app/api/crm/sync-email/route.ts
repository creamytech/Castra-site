import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRecentThreads, getThreadDetail } from '@/lib/google'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get recent email threads
    const threads = await listRecentThreads(
      session.user.id,
      20
    )

    let syncedCount = 0
    const newContacts = []

    // Extract unique senders from email threads
    const uniqueSenders = new Map()
    
    for (const thread of threads) {
      try {
        // Get thread details to extract sender information
        const threadDetail = await getThreadDetail(
          session.user.id,
          thread.id!
        )

        // Extract sender from the first message in the thread
        const firstMessage = threadDetail.messages?.[0]
        if (firstMessage) {
          const fromHeader = firstMessage.payload?.headers?.find(h => h.name.toLowerCase() === 'from')
          const sender = fromHeader?.value || ''
          
          if (sender && !uniqueSenders.has(sender)) {
            // Parse email to extract name
            const emailMatch = sender.match(/"?([^"<]+)"?\s*<?([^>]+)>?/)
            const name = emailMatch ? emailMatch[1].trim() : sender.split('@')[0]
            const email = emailMatch ? emailMatch[2] : sender
            
            // Check if contact already exists
            const existingContact = await prisma.contact.findFirst({
              where: {
                userId: session.user.id,
                email: email
              }
            })

            if (!existingContact) {
              // Create new contact
              const contact = await prisma.contact.create({
                data: {
                  userId: session.user.id,
                  firstName: name.split(' ')[0] || 'Unknown',
                  lastName: name.split(' ').slice(1).join(' ') || 'Contact',
                  email: email,
                  tags: ['email-contact'],
                  notes: `Synced from email on ${new Date().toLocaleDateString()}`
                }
              })
              newContacts.push(contact)
              syncedCount++
            }
            
            uniqueSenders.set(sender, { email, name })
          }
        }
      } catch (error) {
        console.error('Failed to process thread:', thread.id, error)
        // Continue with next thread
      }
    }

    return NextResponse.json({ 
      syncedCount,
      contacts: newContacts 
    })
  } catch (error: any) {
    console.error('CRM sync email error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to sync from email' }, 
      { status: 500 }
    )
  }
}

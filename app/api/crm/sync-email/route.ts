import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRecentThreads } from '@/lib/google'

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

    // Get recent email threads
    const threads = await listRecentThreads(
      (session.user as any).id,
      { maxResults: 20 },
      sessionTokens
    )

    let syncedCount = 0
    const newContacts = []

    // Extract unique senders from email threads
    const uniqueSenders = new Map()
    
    for (const thread of threads) {
      const sender = thread.sender
      if (sender && !uniqueSenders.has(sender)) {
        uniqueSenders.set(sender, {
          email: sender,
          name: sender.split('@')[0], // Basic name extraction
          source: 'email',
          tags: ['email-contact'],
          lastContact: thread.date,
          emailCount: 1,
          meetingCount: 0,
          leadScore: 30, // Default score for email contacts
          status: 'new' as const,
          createdAt: new Date().toISOString()
        })
        syncedCount++
      } else if (uniqueSenders.has(sender)) {
        // Increment email count for existing sender
        const existing = uniqueSenders.get(sender)
        existing.emailCount++
        existing.lastContact = thread.date
      }
    }

    // Convert to array
    const contacts = Array.from(uniqueSenders.values())

    return NextResponse.json({ 
      syncedCount,
      contacts 
    })
  } catch (error: any) {
    console.error('CRM sync email error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to sync from email' }, 
      { status: 500 }
    )
  }
}

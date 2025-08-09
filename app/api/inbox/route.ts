import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRecentThreads, getThreadDetail } from '@/lib/google'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const maxResults = parseInt(searchParams.get('maxResults') || '10')
    const threadId = searchParams.get('threadId')

    // Pass session tokens for JWT strategy
    const sessionTokens = {
      accessToken: (session as any).accessToken,
      refreshToken: (session as any).refreshToken,
    }

    if (threadId) {
      // Get specific thread details
      const thread = await getThreadDetail(session.user.id, threadId, sessionTokens)
      return NextResponse.json({ thread })
    } else {
      // List recent threads
      const threads = await listRecentThreads(session.user.id, maxResults, sessionTokens)
      return NextResponse.json({ threads })
    }
  } catch (error) {
    console.error('Inbox API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check if Google account is connected and tokens are valid'
      },
      { status: 500 }
    )
  }
}

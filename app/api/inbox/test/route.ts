import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRecentThreads } from '@/lib/google'

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

    // Test Gmail API access
    const threads = await listRecentThreads(session.user.id, 5)
    
    return NextResponse.json({
      success: true,
      message: 'Gmail API access working',
      threadCount: threads.length,
      threads: threads.map((thread: any) => ({
        id: thread.id,
        snippet: thread.snippet
      }))
    })
  } catch (error) {
    console.error('Gmail API test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check if Google account is connected and tokens are valid'
      },
      { status: 500 }
    )
  }
}

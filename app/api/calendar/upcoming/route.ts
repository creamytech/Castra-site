import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUpcomingEvents } from '@/lib/google'

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const max = Number(searchParams.get('max') ?? 10)
    const timeMinISO = searchParams.get('timeMinISO') ?? undefined

    try {
      const events = await listUpcomingEvents(
        session.user.id, 
        { max, timeMinISO }
      )
      
      return NextResponse.json({ events })
    } catch (googleError: any) {
      console.error('[calendar-upcoming] Google API error:', googleError);
      
      // Check if it's an authentication error
      if (googleError.message?.includes("not connected") || googleError.message?.includes("no valid tokens")) {
        return NextResponse.json({ 
          error: "Google account not connected. Please connect your Google account to view calendar events.",
          events: [],
          needsAuth: true
        }, { status: 401 });
      }
      
      // Check if it's a permission error
      if (googleError.message?.includes("access denied") || googleError.message?.includes("permission")) {
        return NextResponse.json({ 
          error: "Calendar access denied. Please check your Google account permissions.",
          events: [],
          needsAuth: true
        }, { status: 403 });
      }
      
      // For other errors, return empty events with error message
      return NextResponse.json({ 
        error: "Failed to fetch calendar events. Please try again later.",
        events: [],
        retryable: true
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[calendar-upcoming] Unexpected error:', error);
    return NextResponse.json({ 
      error: "An unexpected error occurred while fetching calendar events.",
      events: [],
      retryable: true
    }, { status: 500 });
  }
}

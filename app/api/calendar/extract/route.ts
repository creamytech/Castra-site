import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateCalendarEventExtraction } from '@/lib/llm'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { message } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const eventDetails = await generateCalendarEventExtraction(message)
    
    return NextResponse.json({ eventDetails })
  } catch (error: any) {
    console.error('Calendar event extraction error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to extract event details' }, 
      { status: 500 }
    )
  }
}

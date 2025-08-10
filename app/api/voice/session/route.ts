import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionContext } from '@/lib/agent/context'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const context = await getSessionContext(session.user.id)

  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'verse',
      instructions:
        'You are Castra, a voice-enabled real estate assistant with full access to the user\'s CRM, leads, MLS, and messaging tools. Always respond conversationally in under 20 seconds unless the user requests detail. Use available data to answer and act.',
      data: context,
    }),
  })

  const data = await res.json()
  return NextResponse.json(data)
}

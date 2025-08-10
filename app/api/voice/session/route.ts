import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionContext } from '@/lib/agent/context'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })

  try {
    const context = await getSessionContext(session.user.id)
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17'
    const voice = 'verse'

    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, voice, instructions: 'You are Castra, a voice-enabled real estate assistant...', data: context }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `OpenAI session failed: ${text}` }, { status: 502 })
    }

    const json = await res.json()
    const sdpEndpoint = json?.client_secret?.value
    if (!sdpEndpoint) return NextResponse.json({ error: 'Missing SDP endpoint from OpenAI' }, { status: 502 })

    return NextResponse.json({ sdpEndpoint, model: json.model || model, voice: json.voice || voice })
  } catch (e: any) {
    return NextResponse.json({ error: `Voice session error: ${e?.message || 'unknown'}` }, { status: 500 })
  }
}

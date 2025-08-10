import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionContext } from '@/lib/agent/context'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })

    const context = await getSessionContext(session.user.id)
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17'
    const voice = (context as any)?.voice || 'verse'
    const instructions = `You are Castra, a voice-enabled real estate assistant. Use a ${(context as any)?.styleGuide?.tone || 'friendly'} tone. ${(context as any)?.styleGuide?.description || 'Concise, conversational, helpful.'} You can access CRM, Inbox, Calendar, SMS, Instagram, and MLS tools. Keep responses natural and under ~20 seconds unless asked for detail.`

    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, voice: voice || 'verse', instructions }),
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
    console.error('VOICE_SESSION_ERROR', e)
    return NextResponse.json({ error: 'Voice session failed. DB profile not available or OpenAI session error.', detail: e?.message || String(e) }, { status: 500 })
  }
}

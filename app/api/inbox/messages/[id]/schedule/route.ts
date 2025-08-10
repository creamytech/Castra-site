import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/agent/skills/calendar'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { when, duration = 30, attendees = [], dealId } = await request.json()
    if (!when) return NextResponse.json({ error: 'when required' }, { status: 400 })

    const start = new Date(when)
    const end = new Date(start.getTime() + duration * 60000)
    const created = await createCalendarEvent(session.user.id, { summary: 'Showing', startISO: start.toISOString(), endISO: end.toISOString(), attendees: attendees.map((e: string)=>({ email: e })) })
    const createdSafe = JSON.parse(JSON.stringify(created))
    if (dealId) await prisma.activity.create({ data: { dealId, userId: session.user.id, kind: 'MEETING', channel: 'calendar', subject: 'Showing scheduled', body: '', meta: { created: createdSafe } } })
    return NextResponse.json({ success: true, created })
  } catch (e: any) {
    console.error('[inbox schedule]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

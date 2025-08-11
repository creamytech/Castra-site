import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthorizedGmail } from '@/lib/google'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BodySchema = z.object({ connectionId: z.string().min(1) })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { connectionId } = BodySchema.parse(body)
    const { gmail } = await getAuthorizedGmail(connectionId)
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC as string
    if (!topicName) return NextResponse.json({ error: 'GOOGLE_PUBSUB_TOPIC missing' }, { status: 500 })
    const res = await gmail.users.watch({ userId: 'me', requestBody: { topicName, labelIds: ['INBOX'], labelFilterAction: 'include' } })
    return NextResponse.json({ ok: true, expiration: res.data.expiration, historyId: res.data.historyId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}



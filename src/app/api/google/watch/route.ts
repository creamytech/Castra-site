import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthorizedGmail } from '@/lib/google'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BodySchema = z.object({ connectionId: z.string().min(1) })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { connectionId } = BodySchema.parse(body)
    const { gmail, connection } = await getAuthorizedGmail(connectionId)
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC as string
    if (!topicName) return NextResponse.json({ error: 'GOOGLE_PUBSUB_TOPIC missing' }, { status: 500 })
    // Resolve optional custom label "Leads" to its id
    const labels = await gmail.users.labels.list({ userId: 'me' })
    const leadsLabelId = (labels.data.labels || [])
      .find(l => (l.name || '').toLowerCase() === 'leads')?.id
    const labelIds = ['INBOX', ...(leadsLabelId ? [leadsLabelId] : [])]
    const res = await gmail.users.watch({ userId: 'me', requestBody: { topicName, labelIds, labelFilterAction: 'include' } })
    // Persist watch state on connection
    try {
      await (prisma as any).connection.update({ where: { id: connection.id }, data: { watch: { historyId: res.data.historyId, labelIds, expiration: res.data.expiration } } })
    } catch {}
    return NextResponse.json({ ok: true, expiration: res.data.expiration, historyId: res.data.historyId, labelIds })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}



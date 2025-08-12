import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthorizedGmail } from '@/lib/google'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const topic = process.env.GOOGLE_PUBSUB_TOPIC
  if (!topic) return NextResponse.json({ error: 'GOOGLE_PUBSUB_TOPIC not set' }, { status: 500 })
  const conns = await (prisma as any).connection.findMany({ where: { provider: 'google' } })
  let renewed = 0
  for (const c of conns) {
    try {
      const { gmail } = await getAuthorizedGmail(c.id)
      const labels = await gmail.users.labels.list({ userId: 'me' })
      const leadsLabelId = (labels.data.labels || []).find(l => (l.name || '').toLowerCase() === 'leads')?.id
      const labelIds = ['INBOX', ...(leadsLabelId ? [leadsLabelId] : [])]
      const expiration = Number(c.watch?.expiration || 0)
      const sixHours = Date.now() + 6 * 3600 * 1000
      if (!expiration || expiration < sixHours) {
        const res = await gmail.users.watch({ userId: 'me', requestBody: { topicName: topic, labelIds, labelFilterAction: 'include' } })
        await (prisma as any).connection.update({ where: { id: c.id }, data: { watch: { historyId: res.data.historyId, labelIds, expiration: res.data.expiration } } })
        renewed++
      }
    } catch (e) {
      // continue
    }
  }
  return NextResponse.json({ ok: true, renewed, total: conns.length })
}



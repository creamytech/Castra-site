import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthorizedGmail } from '@/lib/google'

export async function POST() {
  const conns = await (prisma as any).connection?.findMany?.({ where: { provider: 'google' } })
  for (const c of conns) {
    const { gmail } = await getAuthorizedGmail(c.id)
    const labels = await gmail.users.labels.list({ userId: 'me' })
    const leadsLabelId = (labels.data.labels || []).find(l => (l.name || '').toLowerCase() === 'leads')?.id
    const labelIds = ['INBOX', ...(leadsLabelId ? [leadsLabelId] : [])]
    await gmail.users.watch({ userId: 'me', requestBody: { labelIds, topicName: process.env.GOOGLE_PUBSUB_TOPIC! } })
  }
  return NextResponse.json({ ok: true, count: conns.length })
}



import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { oauth2 } = await getGoogleAuthForUser(session.user.id)
    const gmail = gmailClient(oauth2)

    // List recent messages (last 60 days)
    const q = 'newer_than:60d in:anywhere'
    const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50 })
    const ids = (list.data.messages || []).map(m => m.id!).filter(Boolean)

    for (const id of ids) {
      const m = await gmail.users.messages.get({ userId: 'me', id: id!, format: 'full' })
      const data = m.data
      const threadId = data.threadId!
      const headers = (data.payload?.headers || []) as any[]
      const h = Object.fromEntries(headers.map((hh: any) => [hh.name.toLowerCase(), hh.value])) as any
      const subject = h['subject'] || null
      const from = h['from'] || ''
      const to = (h['to'] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      const cc = (h['cc'] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      const date = new Date(Number(data.internalDate))
      const snippet = data.snippet || ''

      const parts: any[] = []
      const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts || []).forEach((pp: any) => walk(pp)) }
      walk(data.payload)
      let bodyText = ''
      let bodyHtml = ''
      for (const p of parts) {
        const b64 = p.body?.data
        if (!b64) continue
        const buff = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        const text = buff.toString('utf-8')
        if (p.mimeType?.includes('text/plain')) bodyText += text
        if (p.mimeType?.includes('text/html')) bodyHtml += text
      }

      await prisma.emailThread.upsert({
        where: { id: threadId },
        create: { id: threadId, userId: session.user.id, subject, lastSyncedAt: new Date() },
        update: { subject, lastSyncedAt: new Date() },
      })

      await prisma.emailMessage.upsert({
        where: { id: id! },
        create: {
          id: id!, threadId, userId: session.user.id, from, to, cc, date, snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null,
          internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })),
        },
        update: { snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null, internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })) },
      })
    }

    const counts = {
      threads: await prisma.emailThread.count({ where: { userId: session.user.id } }),
      messages: await prisma.emailMessage.count({ where: { userId: session.user.id } }),
    }
    return NextResponse.json({ ok: true, synced: ids.length, counts })
  } catch (e: any) {
    console.error('[inbox sync]', e)
    return NextResponse.json({ error: 'Sync failed', detail: e?.message || String(e) }, { status: 500 })
  }
}



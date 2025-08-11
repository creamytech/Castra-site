import type { gmail_v1 } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function listHistorySince(gmail: gmail_v1.Gmail, connection: any) {
  const watch = connection.watch || {}
  const labelIds: string[] = watch.labelIds ?? ['INBOX']
  const historyId = watch.historyId

  const res = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: historyId,
    historyTypes: ['messageAdded'],
    labelId: labelIds as any,
    maxResults: 500
  })

  const history = res.data.history ?? []
  const messageIds = new Set<string>()
  for (const h of history) {
    for (const m of (h.messagesAdded ?? [])) {
      if (m.message?.id) messageIds.add(m.message.id)
    }
  }
  const newHistoryId = (res.data as any).historyId ?? (history as any).at?.(-1)?.id
  return { messageIds: Array.from(messageIds), newHistoryId }
}

export async function saveHistoryCursor(connectionId: string, historyId: string) {
  await (prisma as any).connection?.update?.({
    where: { id: connectionId },
    data: { watch: { ...(Object as any).assign({}, {}), historyId } as any }
  })
}

export async function normalizeMessage(gmail: gmail_v1.Gmail, id: string) {
  const { data } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
  const headers = Object.fromEntries((data.payload?.headers ?? []).map((h) => [h.name!, h.value ?? ''])) as Record<string, string>
  const subject = headers['Subject'] ?? ''
  const fromRaw = headers['From'] ?? ''
  const m = fromRaw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/)
  const fromName = m?.[1] || undefined
  const fromEmail = m?.[2] || undefined
  const snippet = data.snippet ?? ''

  function walk(p?: gmail_v1.Schema$MessagePart): string {
    if (!p) return ''
    if (p.mimeType === 'text/plain' && p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf8')
    if (p.mimeType === 'text/html' && p.body?.data) {
      const html = Buffer.from(p.body.data, 'base64').toString('utf8')
      return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
    }
    return (p.parts ?? []).map(walk).join('\n')
  }
  const body = walk(data.payload!).trim()

  return { subject, body, headers, threadId: data.threadId, fromEmail, fromName, snippet }
}



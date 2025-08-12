import type { gmail_v1 } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, metricIncr, metricGet } from '@/lib/cache'

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
  await metricIncr(`gmail.history.calls:${connection.userId || connection.id}`, 1)
  await metricIncr('gmail.history.calls', 1)
  try {
    const perUser = await metricGet(`gmail.history.calls:${connection.userId || connection.id}`)
    if (perUser > 2000) console.warn(`[gmail] high history calls for user ${connection.userId || connection.id}: ${perUser}`)
  } catch {}

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
  const shallowFields = 'threadId,id,snippet,payload/headers,internalDate,etag'
  const cacheKey = `gmail:msg:${id}`
  const cached = await cacheGet<{ id: string; etag: string; normalized: any }>(cacheKey)
  let data: any
  let etag: string | undefined
  if (cached?.etag) {
    try {
      const meta: any = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From','Subject','Date','To','List-Unsubscribe','Precedence','Return-Path'], fields: shallowFields as any, ifNoneMatch: cached.etag } as any)
      await metricIncr('gmail.messages.get.meta', 1)
      data = meta.data
      etag = (meta.data as any).etag
    } catch (err: any) {
      if (err?.code === 304) {
        await metricIncr('gmail.etag.hit', 1)
        return cached.normalized
      }
      // Fallback to normal fetch
      const meta: any = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From','Subject','Date','To','List-Unsubscribe','Precedence','Return-Path'], fields: shallowFields as any })
      await metricIncr('gmail.messages.get.meta', 1)
      data = meta.data
      etag = (meta.data as any).etag
    }
  } else {
    const meta: any = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From','Subject','Date','To','List-Unsubscribe','Precedence','Return-Path'], fields: shallowFields as any })
    await metricIncr('gmail.messages.get.meta', 1)
    data = meta.data
    etag = (meta.data as any).etag
  }
  const headers = Object.fromEntries(((data.payload?.headers ?? []) as Array<{ name?: string; value?: string }>).
    map((h: { name?: string; value?: string }) => [h.name as string, h.value ?? ''])) as Record<string, string>
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
  // Heuristics on headers + snippet to decide if full fetch is needed
  const vendorish = /(unsubscribe|list-unsubscribe|no-reply|news|promo|marketing|precedence: bulk)/i.test(JSON.stringify(headers) + ' ' + snippet)
  const likelyLead = /(tour|showing|offer|interested|schedule|budget|price|appointment)/i.test(`${subject} ${snippet}`)

  let body = ''
  if (!vendorish || likelyLead) {
    // Fetch full body but limit fields to keep payload small
    const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full', fields: 'threadId,id,snippet,payload/headers,payload/parts,payload/body,internalDate,etag' as any })
    await metricIncr('gmail.messages.get.full', 1)
    const fullData: any = full.data
    const walkFull = (p?: gmail_v1.Schema$MessagePart): string => {
      if (!p) return ''
      if (p.mimeType === 'text/plain' && p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf8')
      if (p.mimeType === 'text/html' && p.body?.data) {
        const html = Buffer.from(p.body.data, 'base64').toString('utf8')
        return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
      }
      return (p.parts ?? []).map(walkFull).join('\n')
    }
    body = walkFull(fullData.payload!).trim()
  }

  const internalDateMs = Number(data.internalDate || '0') || undefined
  const normalized = { subject, body, headers, threadId: data.threadId, fromEmail, fromName, snippet, internalDateMs }
  await cacheSet(cacheKey, { id, etag: etag || '', normalized }, 600)
  return normalized
}



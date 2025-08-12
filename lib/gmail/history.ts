import { google } from 'googleapis'
import { prisma } from '@/lib/securePrisma'
import { getGoogleAuthForUser } from '@/lib/gmail/client'
import { putEncryptedObject } from '@/lib/storage'
import { cacheGet, cacheSet } from '@/lib/cache'

const LABEL_CACHE_TTL = 180

export async function getLabelMap(userId: string): Promise<Record<string,string>> {
  const key = `gmail:labels:${userId}`
  const cached = await cacheGet<Record<string,string>>(key)
  if (cached) return cached
  const { oauth2 } = await getGoogleAuthForUser(userId)
  const gmail = google.gmail({ version: 'v1', auth: oauth2 })
  const res = await gmail.users.labels.list({ userId: 'me' })
  const map: Record<string,string> = {}
  for (const l of res.data.labels || []) if (l.id && l.name) map[l.id] = l.name
  await cacheSet(key, map, LABEL_CACHE_TTL)
  return map
}

export async function syncSinceHistoryId(userId: string, mailboxId: string, historyId: string | null) {
  const { oauth2 } = await getGoogleAuthForUser(userId)
  const gmail = google.gmail({ version: 'v1', auth: oauth2 })
  let pageToken: string | undefined = undefined
  let startHistoryId = historyId || undefined
  const labelMap = await getLabelMap(userId)

  do {
    const historyRes: any = await gmail.users.history.list({ userId: 'me', startHistoryId, pageToken, historyTypes: ['messageAdded','labelsAdded','labelsRemoved'] as any, maxResults: 200 })
    const histories = historyRes.data.history || []
    for (const h of histories) {
      const added = h.messagesAdded || []
      for (const a of added) {
        const m = a.message
        if (!m?.id || !m.threadId) continue
        // fetch message
        const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' })
        const headers = full.data.payload?.headers || []
        const from = String(headers.find((hh: any)=>hh.name==='From')?.value || '')
        const snippet = full.data.snippet || ''
        const internalDate = new Date(Number(full.data.internalDate || 0))
        // build body
        const parts: any[] = []
        const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts || []).forEach((pp: any) => walk(pp)) }
        walk(full.data.payload)
        let body = ''
        for (const p of parts) {
          const b64 = p.body?.data; if (!b64) continue
          const buff = Buffer.from(String(b64).replace(/-/g,'+').replace(/_/g,'/'), 'base64')
          const txt = buff.toString('utf-8')
          if (p.mimeType?.includes('text/html')) body = txt
          else if (!body && p.mimeType?.includes('text/plain')) body = txt
        }
        // ensure mailbox/thread
        const thread = await prisma.thread.upsert({ where: { providerThreadId: m.threadId }, create: { providerThreadId: m.threadId, mailboxId, latestAt: internalDate }, update: { latestAt: internalDate } })
        let bodyRef: string | null = null
        if (body) {
          const objectKey = `mail/${mailboxId}/${m.id}`
          await putEncryptedObject(Buffer.from(body, 'utf8'), objectKey)
          bodyRef = objectKey
        }
        await prisma.secureMessage.upsert({
          where: { providerMessageId: m.id },
          update: { historyId: String(h.id || ''), receivedAt: internalDate, bodyRef },
          create: { threadId: thread.id, providerMessageId: m.id, historyId: String(h.id || ''), fromEnc: Buffer.from(from), toEnc: Buffer.from(''), snippetEnc: Buffer.from(snippet), receivedAt: internalDate, hasAttachment: false, bodyRef }
        })
      }
    }
    pageToken = historyRes.data.nextPageToken || undefined
    if (historyRes.data.historyId) startHistoryId = historyRes.data.historyId
  } while (pageToken)
  return startHistoryId || historyId
}



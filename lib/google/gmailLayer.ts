import { getGmailForUser } from '@/lib/google/gmail'

export type ListThreadsParams = { q?: string; pageToken?: string; labelIds?: string[] }

export async function getProfile(userId: string) {
  const gmail = await getGmailForUser(userId)
  const res = await gmail.users.getProfile({ userId: 'me' })
  return res.data
}

export async function listThreads(userId: string, params: ListThreadsParams = {}) {
  const gmail = await getGmailForUser(userId)
  const res = await gmail.users.threads.list({ userId: 'me', q: params.q, pageToken: params.pageToken, labelIds: params.labelIds, maxResults: 50 })
  return res.data
}

export async function getThread(userId: string, threadId: string) {
  const gmail = await getGmailForUser(userId)
  const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' })
  const thread = res.data
  const messages = (thread.messages || []).map((m: any) => normalizeMessage(m))
  return { id: thread.id!, historyId: thread.historyId, messages }
}

function decodeBody(data?: string | null): string {
  if (!data) return ''
  const buff = Buffer.from(String(data).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return buff.toString('utf-8')
}

function header(headers: any[], name: string): string | undefined {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value
}

function normalizeMessage(m: any) {
  const headers = m.payload?.headers || []
  const from = header(headers, 'From') || ''
  const to = header(headers, 'To') || ''
  const subject = header(headers, 'Subject') || ''
  const dateStr = header(headers, 'Date')
  const date = dateStr ? new Date(dateStr) : new Date(Number(m.internalDate || 0))
  const parts: any[] = []
  const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts || []).forEach((pp: any) => walk(pp)) }
  walk(m.payload)
  let bodyText = ''
  let bodyHtml = ''
  for (const p of parts) {
    const b64 = p.body?.data; if (!b64) continue
    const text = decodeBody(b64)
    if (p.mimeType?.includes('text/plain')) bodyText += text
    if (p.mimeType?.includes('text/html')) bodyHtml += text
  }
  return { id: m.id, threadId: m.threadId, from, to, subject, date, snippet: m.snippet, bodyText, bodyHtml, internalDate: new Date(Number(m.internalDate || 0)), labelIds: m.labelIds || [] }
}

export async function incrementalSync(userId: string, sinceHistoryId: string) {
  const gmail = await getGmailForUser(userId)
  const res = await gmail.users.history.list({ userId: 'me', startHistoryId: sinceHistoryId, historyTypes: ['messageAdded','messageDeleted','labelAdded','labelRemoved'] as any, maxResults: 250 })
  const history = res.data.history || []
  const changedThreadIds = new Set<string>()
  for (const h of history) {
    for (const entry of (h.messagesAdded || [])) changedThreadIds.add(entry.message?.threadId!)
    for (const entry of (h.labelsAdded || [])) changedThreadIds.add(entry.message?.threadId!)
  }
  const threads = await Promise.all(Array.from(changedThreadIds).map((tid) => getThread(userId, tid)))
  const newHistoryId = res.data.historyId || history.at(-1)?.id || sinceHistoryId
  return { threads, newHistoryId }
}

export async function createDraft(userId: string, input: { to: string; subject: string; html: string; references?: string; inReplyTo?: string }) {
  const gmail = await getGmailForUser(userId)
  const raw = buildRawEmail(input.to, input.subject, input.html, input.references, input.inReplyTo)
  const res = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } })
  return res.data
}

export async function sendDraft(userId: string, draftId: string) {
  const gmail = await getGmailForUser(userId)
  const res = await gmail.users.drafts.send({ userId: 'me', requestBody: { id: draftId } })
  return res.data
}

function buildRawEmail(to: string, subject: string, html: string, references?: string, inReplyTo?: string): string {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    ...(references ? [`References: ${references}`] : []),
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
  ].join('\r\n')
  const data = `${headers}\r\n\r\n${html}`
  return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}



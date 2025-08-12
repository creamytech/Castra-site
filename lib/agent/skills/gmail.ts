import { google } from 'googleapis'
import { getGoogleAuthForUser } from '@/lib/gmail/client'

export async function getOAuthForUser(userId: string) {
  const { oauth2 } = await getGoogleAuthForUser(userId)
  return oauth2
}

export async function sendEmail(userId: string, to: string, subject: string, body: string, threadId?: string) {
  const auth = await getOAuthForUser(userId)
  const gmail = google.gmail({ version: 'v1', auth })
  const msg = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\n')
  const raw = Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const sent = await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId } })
  return sent.data
}

export async function listRecentThreads(userId: string, maxResults = 10) {
  const auth = await getOAuthForUser(userId)
  const gmail = google.gmail({ version: 'v1', auth })
  const res = await gmail.users.threads.list({ userId: 'me', maxResults })
  return res.data.threads || []
}

export async function summarizeThread(_userId: string, _threadId: string): Promise<string> {
  // TODO: Implement with OpenAI and cached EmailThreadCache
  return 'Summary not implemented yet.'
}

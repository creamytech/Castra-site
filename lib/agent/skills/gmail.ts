import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function getOAuthForUser(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!account?.access_token) throw new Error('Google account not connected')
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
  oauth2Client.setCredentials({ access_token: account.access_token, refresh_token: account.refresh_token })
  return oauth2Client
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

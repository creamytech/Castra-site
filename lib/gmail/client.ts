import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function getGoogleAuthForUser(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!account?.access_token) throw new Error('No Google account linked')
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  oauth2.setCredentials({
    access_token: account.access_token || undefined,
    refresh_token: account.refresh_token || undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })
  // googleapis will auto-refresh if refresh_token present
  return { oauth2, account }
}

export function gmailClient(oauth2: any) {
  return google.gmail({ version: 'v1', auth: oauth2 })
}



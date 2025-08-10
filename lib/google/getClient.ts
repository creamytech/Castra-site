import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

export async function getGoogleClientsForUser(userId: string) {
  const acct = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!acct?.access_token) throw new Error('No Google token for user')
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )
  oauth2Client.setCredentials({
    access_token: acct.access_token,
    refresh_token: acct.refresh_token ?? undefined,
    expiry_date: acct.expires_at ? acct.expires_at * 1000 : undefined,
    token_type: (acct as any).token_type ?? 'Bearer',
    scope: (acct.scope || undefined) as any,
  })
  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  }
}



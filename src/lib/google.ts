import { google, gmail_v1 } from 'googleapis'
import { prisma } from '@/lib/prisma'

// Given a connectionId, return authorized Gmail client and related user/connection
export async function getAuthorizedGmail(connectionId: string): Promise<{ gmail: gmail_v1.Gmail; connection: any; user: any }> {
  const connection = await (prisma as any).connection.findUnique({ where: { id: connectionId }, include: { user: true } })
  if (!connection) throw new Error('Connection not found')
  if (connection.provider !== 'google') throw new Error('Not a Google connection')

  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
  oauth2.setCredentials({ access_token: connection.accessToken, refresh_token: connection.refreshToken, expiry_date: connection.expiresAt ? Number(connection.expiresAt) * 1000 : undefined })
  const gmail = google.gmail({ version: 'v1', auth: oauth2 })
  return { gmail, connection, user: connection.user }
}



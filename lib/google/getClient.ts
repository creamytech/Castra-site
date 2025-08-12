import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { decryptField, encryptField } from '@/src/lib/crypto/field'

async function maybeDecrypt(val?: string | null): Promise<string | null> {
  if (!val) return val ?? null
  if (val.startsWith('enc:')) return decryptField(val.slice(4))
  return val
}

async function maybeEncrypt(val?: string | null): Promise<string | null> {
  if (!val) return val ?? null
  if (val.startsWith('enc:')) return val
  return 'enc:' + await encryptField(val)
}

export async function getGoogleClientsForUser(userId: string) {
  const acct = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!acct) throw new Error('No Google account for user')

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )

  const accessToken = await maybeDecrypt(acct.access_token)
  const refreshToken = await maybeDecrypt(acct.refresh_token)

  oauth2Client.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken ?? undefined,
    expiry_date: acct.expires_at ? acct.expires_at * 1000 : undefined,
    token_type: (acct as any).token_type ?? 'Bearer',
    scope: (acct.scope || undefined) as any,
  })

  oauth2Client.on('tokens', async (tokens) => {
    const updates: any = {}
    if (tokens.access_token) updates.access_token = await maybeEncrypt(tokens.access_token)
    if (tokens.refresh_token) updates.refresh_token = await maybeEncrypt(tokens.refresh_token)
    if (tokens.expiry_date) updates.expires_at = Math.floor(tokens.expiry_date / 1000)
    if (Object.keys(updates).length) {
      try { await prisma.account.update({ where: { id: acct.id }, data: updates }) } catch {}
    }
  })

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  }
}



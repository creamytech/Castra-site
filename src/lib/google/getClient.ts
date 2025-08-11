import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { decryptField, encryptField } from '@/src/lib/crypto/field'

export async function getGoogleOAuth(userId: string) {
  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!account) throw new Error('No Google account')
  const accessToken = account.access_token ? await maybeDecrypt(account.access_token) : undefined
  const refreshToken = account.refresh_token ? await maybeDecrypt(account.refresh_token) : undefined
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken, expiry_date: account.expires_at ? account.expires_at * 1000 : undefined })
  client.on('tokens', async (tokens) => {
    const updates: any = {}
    if (tokens.access_token) updates.access_token = await maybeEncrypt(tokens.access_token)
    if (tokens.refresh_token) updates.refresh_token = await maybeEncrypt(tokens.refresh_token)
    if (tokens.expiry_date) updates.expires_at = Math.floor(tokens.expiry_date / 1000)
    if (Object.keys(updates).length) {
      await prisma.account.updateMany({ where: { userId, provider: 'google' }, data: updates })
    }
  })
  return client
}

async function maybeEncrypt(value: string): Promise<string> {
  if (!value) return value
  if (value.startsWith('enc:')) return value
  return 'enc:' + await encryptField(value)
}
async function maybeDecrypt(stored: string): Promise<string> {
  if (!stored) return stored
  if (stored.startsWith('enc:')) return decryptField(stored.slice(4))
  return stored
}



import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { decryptField, encryptField } from '@/src/lib/crypto/field'

export async function getGoogleAuthForUser(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!account) throw new Error('No Google account linked')
  const accessToken = await maybeDecrypt(account.access_token)
  const refreshToken = await maybeDecrypt(account.refresh_token)
  if (!accessToken && !refreshToken) throw new Error('Missing Google tokens')
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  oauth2.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })
  oauth2.on('tokens', async (tokens) => {
    const updates: any = {}
    if (tokens.access_token) updates.access_token = await maybeEncrypt(tokens.access_token)
    if (tokens.refresh_token) updates.refresh_token = await maybeEncrypt(tokens.refresh_token)
    if (tokens.expiry_date) updates.expires_at = Math.floor(tokens.expiry_date / 1000)
    if (Object.keys(updates).length) await prisma.account.update({ where: { id: account.id }, data: updates })
  })
  return { oauth2, account }
}

export function gmailClient(oauth2: any) {
  return google.gmail({ version: 'v1', auth: oauth2 })
}

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



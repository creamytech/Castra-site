import { google } from 'googleapis'
import { prisma } from '@/lib/securePrisma'
import { decryptRefreshToken, encryptRefreshToken, cacheAccessToken, getCachedAccessToken } from '@/lib/token'

export async function getGoogleAuthForUser(userId: string) {
  // Ensure RLS context for this connection
  try { await (prisma as any).$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, userId) } catch {}
  const account = await prisma.mailAccount.findFirst({ where: { userId, provider: 'google' } })
  if (!account) throw new Error('No Google account linked')

  let accessToken = await getCachedAccessToken(userId, 'google')
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  const refreshToken = await decryptRefreshToken(account.refreshTokenEnc as any)
  oauth2.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken,
  })
  // Probe scopes to ensure Gmail access
  try {
    const tokenInfo = await oauth2.getTokenInfo(oauth2.credentials.access_token || '')
    const scopes = (tokenInfo?.scopes || []) as string[]
    const needsScopes = !scopes?.some(s => s.includes('gmail'))
    if (needsScopes) throw new Error('Missing Gmail scopes')
  } catch (e) {
    throw new Error('Re-consent required for Gmail scopes')
  }
  // Ensure required scopes present; if not, caller should re-consent
  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      const ttl = tokens.expiry_date ? Math.max(60, Math.floor((tokens.expiry_date - Date.now()) / 1000) - 30) : 300
      await cacheAccessToken(userId, 'google', tokens.access_token, ttl)
    }
    if (tokens.refresh_token) {
      const enc = await encryptRefreshToken(tokens.refresh_token)
      await prisma.mailAccount.update({ where: { id: account.id }, data: { refreshTokenEnc: enc } })
    }
  })
  return { oauth2, account }
}

export function gmailClient(oauth2: any) {
  return google.gmail({ version: 'v1', auth: oauth2 })
}

// plaintext tokens are not persisted



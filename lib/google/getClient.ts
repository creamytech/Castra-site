import { google } from 'googleapis'
import { getAccessTokenForUser } from '@/lib/google/exchange'

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
  const { accessToken } = await getAccessTokenForUser(userId)
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )
  oauth2Client.setCredentials({ access_token: accessToken })
  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  }
}



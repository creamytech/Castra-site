import { withRLS } from '@/lib/rls'
import { prisma } from '@/lib/securePrisma'
import { decryptBytesToString, encryptStringToBytes } from '@/lib/secure-fields'

export async function getAccessTokenForUser(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
  const acc = await withRLS(userId, async (tx) => {
    return (tx as any).mailAccount.findFirst({
      where: { userId, provider: 'google' },
      select: { id: true, refreshTokenEnc: true }
    })
  })
  // If no secure refresh token yet, fallback to adapter access_token to keep UX working
  if (!acc?.refreshTokenEnc || !Buffer.isBuffer(acc.refreshTokenEnc) || acc.refreshTokenEnc.length === 0) {
    const adapter = await (prisma as any).account.findFirst({ where: { userId, provider: 'google' }, select: { access_token: true } })
    if (adapter?.access_token) {
      return { accessToken: String(adapter.access_token), expiresIn: 300 }
    }
    throw new Error('no_refresh_token')
  }

  const refreshToken = await decryptBytesToString(acc.refreshTokenEnc as any)
  if (!refreshToken) throw new Error('decrypt_failed')

  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data: any = await resp.json()
    if (!resp.ok) {
      const err = data?.error || data?.error_description || 'exchange_failed'
      if (String(err) === 'invalid_grant') throw new Error('invalid_grant')
      throw new Error(`token_exchange_failed:${String(err)}`)
    }

    if (data.refresh_token) {
      const rtEnc = await encryptStringToBytes(String(data.refresh_token))
      if (rtEnc) {
        await withRLS(userId, async (tx) => {
          await (tx as any).mailAccount.update({ where: { id: acc.id }, data: { refreshTokenEnc: rtEnc } })
        })
      }
    }

    return { accessToken: String(data.access_token), expiresIn: Number(data.expires_in || 0) }
  } catch (e: any) {
    const msg = e?.message || 'exchange_failed'
    if (msg === 'invalid_grant') throw e
    throw new Error(String(msg))
  }
}



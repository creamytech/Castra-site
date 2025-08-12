import { cacheGet, cacheSet } from './cache'
import { encrypt, decrypt } from './crypto'
import { getDataKey } from './kms'

const TTL = 300

export async function cacheAccessToken(userId: string, provider: string, token: string, ttl: number = TTL) {
  const key = `oauth:${provider}:access:${userId}`
  await cacheSet(key, { token }, Math.max(60, ttl))
}

export async function getCachedAccessToken(userId: string, provider: string): Promise<string | null> {
  const key = `oauth:${provider}:access:${userId}`
  const v = await cacheGet<any>(key)
  return v?.token || null
}

export async function encryptRefreshToken(plain: string): Promise<Buffer> {
  const dek = await getDataKey()
  return encrypt(Buffer.from(plain), dek)
}

export async function decryptRefreshToken(blob: Buffer): Promise<string> {
  const dek = await getDataKey()
  return decrypt(blob, dek).toString('utf8')
}



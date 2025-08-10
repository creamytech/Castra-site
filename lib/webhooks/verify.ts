import crypto from 'crypto'

export function verifyGooglePubSub(req: Request): boolean {
  // Placeholder: For HTTPS push, Google sends JWT in Authorization: Bearer header.
  // Validate JWT audience/issuer in production.
  return true
}

export function verifyInstagramSig(appSecret: string, reqBody: string, headerSig: string | null): boolean {
  if (!appSecret || !headerSig) return false
  const hmac = crypto.createHmac('sha256', appSecret)
  hmac.update(reqBody, 'utf8')
  const digest = `sha256=${hmac.digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(headerSig))
}



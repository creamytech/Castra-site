import { NextResponse } from 'next/server'

// Security headers and CSRF (SameSite Lax) for API
export function middleware(req: Request) {
  const url = new URL(req.url)
  const res = NextResponse.next()

  // HSTS (only in production and on https)
  if (url.protocol === 'https:' || process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  // CSP (relaxed for connect-src to required endpoints)
  res.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self' https://api.openai.com https://www.googleapis.com https://*.twilio.com blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'")
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()')

  // CSRF: issue token if missing and verify for state-changing requests under /api/
  const method = req.method.toUpperCase()
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  const isApi = url.pathname.startsWith('/api/')
  const cookies = (req as any).cookies ?? new Map<string, string>()
  const existing = (cookies.get?.('csrf') as string) || ''
  if (!existing) {
    const token = cryptoRandom()
    const cookie = `csrf=${token}; Path=/; SameSite=Lax; Secure; Max-Age=86400`
    res.headers.append('Set-Cookie', cookie)
  }
  if (isApi && isMutation) {
    const header = (req as any).headers?.get('x-csrf') || ''
    const cookie = existing
    if (!cookie || !header || header !== cookie) {
      return new NextResponse(JSON.stringify({ error: 'CSRF token invalid' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
  }

  return res
}

function cryptoRandom() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).slice(2)
}

export const config = {
  matcher: ['/((?!_next|static|.*\\..*).*)'],
}

// If you need withAuth, merge matchers instead of redefining config

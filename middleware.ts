import { NextResponse, NextRequest } from 'next/server'

// Security headers and CSRF (SameSite Lax) for API
export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const res = NextResponse.next()

  // HSTS (only in production and on https)
  if (url.protocol === 'https:' || process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  // CSP (allow Next.js runtime scripts and dev tools)
  res.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    "media-src 'self' blob: https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    // Allow Google OAuth and APIs just in case any client flows use them
    "connect-src 'self' https://api.openai.com https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://*.twilio.com blob: data: wss:",
    // Permit frames from Google accounts if needed for certain auth UX
    "frame-src 'self' https://accounts.google.com",
    // Allow form submissions back to our site and Google auth endpoints
    "form-action 'self' https://accounts.google.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'"
  ].join('; '))
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()')

  // CSRF: issue token if missing and verify for state-changing requests under /api/
  const method = req.method.toUpperCase()
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  const isApi = url.pathname.startsWith('/api/')
  const existing = req.cookies.get('csrf')?.value || ''
  const skipCsrf = url.pathname.startsWith('/api/auth')
    || url.pathname.startsWith('/api/voice/offer')
    || url.pathname.startsWith('/api/ingest/')
    || url.pathname.startsWith('/api/voice/session')
    || url.pathname.startsWith('/auth/')

  if (!existing) {
    const token = cryptoRandom()
    const cookie = `csrf=${token}; Path=/; SameSite=Lax; Secure; Max-Age=86400`
    res.headers.append('Set-Cookie', cookie)
  }
  if (isApi && isMutation && !skipCsrf) {
    const header = req.headers.get('x-csrf') || ''
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
  // Exclude NextAuth routes to avoid any header/CSP interference during OAuth
  matcher: ['/((?!_next|static|api/auth|.*\\..*).*)'],
}

// If you need withAuth, merge matchers instead of redefining config

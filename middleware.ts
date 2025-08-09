import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Redirect to dashboard after successful login
    if (req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - api/waitlist (waitlist API route)
     * - auth/ (auth pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - marketing routes (demo, terms, privacy, security)
     */
    '/((?!api/auth|api/waitlist|auth|_next/static|_next/image|favicon.ico|public|demo|terms|privacy|security).*)',
  ],
}

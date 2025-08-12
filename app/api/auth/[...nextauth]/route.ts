export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth({
  ...authOptions,
  // Force secure cookies on Vercel; helps ensure callback cookie is accepted
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
  },
  trustHost: true,
})

export { handler as GET, handler as POST }

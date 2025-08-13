import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      oktaId?: string
      groups?: string[]
      orgId?: string | null
      orgRole?: 'OWNER'|'ADMIN'|'MANAGER'|'AGENT'|'VIEWER' | null
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    orgId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    oktaId?: string
    groups?: string[]
  }
}

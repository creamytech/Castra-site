import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import OktaProvider from 'next-auth/providers/okta'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { prisma } from './prisma'
import { config } from './config'

const providers = []

// Add Okta provider if configured
if (config.okta.clientId && config.okta.clientSecret && config.okta.issuer) {
  console.log('Adding Okta provider')
  providers.push(
    OktaProvider({
      clientId: config.okta.clientId,
      clientSecret: config.okta.clientSecret,
      issuer: config.okta.issuer,
    })
  )
}

// Add Google provider if configured
if (config.google.clientId && config.google.clientSecret) {
  console.log('Adding Google provider')
  providers.push(
    GoogleProvider({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly"
          ].join(" ")
        }
      }
    })
  )
} else {
  console.log('Google provider not configured:', {
    clientId: !!config.google.clientId,
    clientSecret: !!config.google.clientSecret
  })
}

// Add Azure AD provider if configured
if (config.azure.clientId && config.azure.clientSecret && config.azure.tenantId) {
  console.log('Adding Azure AD provider')
  providers.push(
    AzureADProvider({
      clientId: config.azure.clientId,
      clientSecret: config.azure.clientSecret,
      tenantId: config.azure.tenantId,
    })
  )
}

console.log('Configured providers:', providers.map(p => p.id))

// Simple adapter - no custom account linking logic
const createAdapter = () => {
  // For development and when no database is configured, disable adapter
  if (process.env.NODE_ENV === 'development' || !config.database.url || !prisma) {
    console.log('Using JWT strategy without database adapter')
    return undefined
  }
  
  return PrismaAdapter(prisma)
}

export const authOptions: NextAuthOptions = {
  adapter: createAdapter(),
  debug: true, // Always enable debug for troubleshooting
  // Allow linking accounts with the same email
  // This will allow users to sign in with different providers using the same email
  callbacks: {
    async signIn({ user, account, profile, email }: any) {
      console.log('SignIn Callback:', { 
        provider: account?.provider,
        type: account?.type,
        userId: user?.id,
        userEmail: user?.email,
        email
      })
      
      // Always allow all sign-ins for development
      console.log('Sign-in allowed for:', account?.provider || account?.type)
      return true
    },
    async jwt({ token, user, account, profile }: any) {
      console.log('JWT Callback:', { 
        provider: account?.provider, 
        hasAccessToken: !!account?.access_token,
        hasRefreshToken: !!account?.refresh_token,
        userId: user?.id 
      })
      
      // Handle Okta tokens
      if (account?.provider === 'okta' && profile) {
        token.oktaId = profile.sub
        token.groups = profile.groups || []
      }
      
      // Handle Google tokens with refresh token support
      if (account?.provider === 'google') {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined
        console.log('Google tokens stored in JWT')
      }
      
      if (user) {
        token.id = user.id
        console.log('User ID set in token:', user.id)
      }
      
      return token
    },
    async session({ session, token }: any) {
      console.log('Session Callback:', { 
        hasToken: !!token,
        userId: token?.id,
        hasGoogleTokens: !!(token?.accessToken || token?.refreshToken)
      })
      
      if (token) {
        session.user.id = token.id
        session.user.oktaId = token.oktaId
        session.user.groups = token.groups
        // Add Google tokens to session
        (session as any).accessToken = token.accessToken
        ;(session as any).refreshToken = token.refreshToken
        ;(session as any).expiresAt = token.expiresAt
      }
      return session
    },
  },
  providers: (() => {
    console.log('Final providers array length:', providers.length)
    if (providers.length > 0) {
      console.log('Using configured providers:', providers.map(p => p.id))
      return providers
    } else {
      console.log('No providers configured, using fallback credentials provider')
      return [
        // Fallback provider for when no OAuth providers are configured
        {
          id: 'credentials',
          name: 'Demo',
          type: 'credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' }
          },
          async authorize(credentials) {
            console.log('Credentials authorize called:', { email: credentials?.email })
            // Allow demo login with any email/password when no OAuth providers are configured
            if (credentials?.email) {
              const user = {
                id: `demo-${Date.now()}`,
                email: credentials.email,
                name: 'Demo User',
              }
              console.log('Demo user created:', user)
              return user
            }
            console.log('No email provided for demo login')
            return null
          }
        }
      ]
    }
  })(),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

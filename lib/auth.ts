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
}

// Add Azure AD provider if configured
if (config.azure.clientId && config.azure.clientSecret && config.azure.tenantId) {
  providers.push(
    AzureADProvider({
      clientId: config.azure.clientId,
      clientSecret: config.azure.clientSecret,
      tenantId: config.azure.tenantId,
    })
  )
}

// Create custom adapter that handles account linking
const createCustomAdapter = () => {
  if (!config.database.url || !prisma) return undefined
  
  const prismaAdapter = PrismaAdapter(prisma)
  
  return {
    ...prismaAdapter,
    linkAccount: async (account: any) => {
      try {
        // Try to link the account normally
        return await prismaAdapter.linkAccount!(account)
      } catch (error: any) {
        // If linking fails due to existing account, try to update it
        if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
          console.log('Account already exists, updating instead of linking')
          // Update existing account instead of creating new one
          return await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              access_token: account.access_token,
              expires_at: account.expires_at,
              refresh_token: account.refresh_token,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
            create: account,
          })
        }
        throw error
      }
    },
  }
}

export const authOptions: NextAuthOptions = {
  adapter: createCustomAdapter(),
  debug: process.env.NODE_ENV === 'development',
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
      
      // For OAuth providers, handle account linking
      if (account?.provider) {
        // Always allow OAuth sign-ins - let the adapter handle account linking
        console.log('OAuth sign-in allowed for provider:', account.provider)
        // For development, allow all OAuth sign-ins
        return true
      }
      
      // For credentials provider (demo), always allow
      if (account?.type === 'credentials') {
        console.log('Credentials sign-in allowed')
        return true
      }
      
      // Allow existing users
      if (user) {
        return true
      }
      
      // Default: allow all sign-ins
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
  providers: providers.length > 0 ? providers : [
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
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

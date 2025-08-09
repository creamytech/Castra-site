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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account, profile }: any) {
      if (account?.provider === 'okta' && profile) {
        token.oktaId = profile.sub
        token.groups = profile.groups || []
      }
      
      if (user) {
        token.id = user.id
      }
      
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id
        session.user.oktaId = token.oktaId
        session.user.groups = token.groups
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import OktaProvider from "next-auth/providers/okta";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { prisma } from "./prisma";
import { PrismaClient } from "@prisma/client";
import { config } from "./config";

// Normalize NEXTAUTH_URL at runtime to avoid trailing-slash callback issues in some deployments
const normalizedAuthUrl = (config.auth.url || '').replace(/\/+$/, '');
if (normalizedAuthUrl) {
  if (process.env.NEXTAUTH_URL !== normalizedAuthUrl) {
    console.log('[auth] Normalizing NEXTAUTH_URL from', process.env.NEXTAUTH_URL, 'to', normalizedAuthUrl);
    process.env.NEXTAUTH_URL = normalizedAuthUrl;
  }
  if (!process.env.NEXTAUTH_URL_INTERNAL) {
    process.env.NEXTAUTH_URL_INTERNAL = normalizedAuthUrl;
  }
}

const providers = [];

// Add Okta provider if configured
if (config.okta.clientId && config.okta.clientSecret && config.okta.issuer) {
  console.log("Adding Okta provider");
  providers.push(
    OktaProvider({
      clientId: config.okta.clientId,
      clientSecret: config.okta.clientSecret,
      issuer: config.okta.issuer,
    })
  );
}

// Add Google provider if configured and not disabled
if (!config.features.googleDisabled && config.google.clientId && config.google.clientSecret) {
  console.log("Adding Google provider");
  providers.push(
    GoogleProvider({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      allowDangerousEmailAccountLinking: true,
      // Keep defaults to isolate callback issues; request extended scopes later after login
    })
  );
} else {
  console.log("Google provider not configured:", {
    clientId: !!config.google.clientId,
    clientSecret: !!config.google.clientSecret,
    disabled: !!config.features.googleDisabled,
  });
}

// Add Azure AD provider if configured
if (config.azure.clientId && config.azure.clientSecret && config.azure.tenantId) {
  console.log("Adding Azure AD provider");
  providers.push(
    AzureADProvider({
      clientId: config.azure.clientId,
      clientSecret: config.azure.clientSecret,
      tenantId: config.azure.tenantId,
    })
  );
}

console.log("Configured providers:", providers.map(p => p.id));

// Use a dedicated Prisma client for NextAuth adapter to isolate from any extensions/middlewares
// Ensure DATABASE_URL exists for the auth client as well
if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}
const prismaAuth = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaAuth as any),
  debug: true,
  // Rely on env vars via config, but set explicitly to avoid env resolution issues
  secret: config.auth.secret,
  logger: {
    error(code, metadata) {
      console.error('[next-auth] error', code, metadata)
    },
    warn(code) {
      console.warn('[next-auth] warn', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[next-auth] debug', code, metadata)
      }
    },
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user?.id) token.id = user.id
      return token
    },
    async redirect({ url, baseUrl }) {
      try {
        console.log('[next-auth] redirect callback', { url, baseUrl })
        // Allow relative URLs
        if (url.startsWith('/')) return `${baseUrl}${url}`
        // Allow same-origin absolute URLs
        const to = new URL(url)
        const base = new URL(baseUrl)
        if (to.origin === base.origin) return url
      } catch {}
      // Fallback to dashboard on cross-origin or invalid URLs
      return `${baseUrl}/dashboard`
    },
    async signIn({ user, account, profile, email }: any) {
      console.log("SignIn Callback:", { 
        provider: account?.provider,
        type: account?.type,
        userId: user?.id,
        userEmail: user?.email,
        email
      });
      
      // Safe Google account linking to prevent OAuthAccountNotLinked
      if (account?.provider === "google" && user?.email) {
        try {
          const existing = await prismaAuth.user.findUnique({ where: { email: user.email } });
          const verified = (profile as any)?.email_verified ?? true;
          
          if (existing && verified) {
            const linked = await prismaAuth.account.findFirst({
              where: { 
                userId: existing.id, 
                provider: "google", 
                providerAccountId: account.providerAccountId 
              },
            });
            
            if (!linked) {
              try {
                await prismaAuth.account.create({
                  data: {
                    userId: existing.id,
                    type: account.type!,
                    provider: "google",
                    providerAccountId: account.providerAccountId!,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                  },
                });
              } catch (err: any) {
                // Ignore unique constraint errors if another link already exists
                if (err?.code !== 'P2002') {
                  console.error('Account link create failed', err);
                }
              }
            }
            
            // Ensure session uses existing user
            (user as any).id = existing.id;
          }
        } catch (linkErr) {
          console.error('Google sign-in linking error', linkErr);
          // Do not block sign-in on linking issues
        }
      }
      
      const allowed = !!(account?.provider === 'google' || account?.type === 'credentials')
      console.log("Sign-in allowed for:", account?.provider || account?.type, '->', allowed);
      return allowed;
    },
    async session({ session, user, token }: any) {
      console.log("Session Callback:", { 
        hasUser: !!user,
        userId: user?.id || token?.id,
        userEmail: user?.email || session?.user?.email,
        sessionKeys: session ? Object.keys(session) : []
      });
      
      // Ensure session.user exists and include user ID
      if (!session.user) {
        session.user = {};
      }
      
      // Set user ID from database user or JWT token
      if (user?.id) session.user.id = user.id;
      if (!session.user.id && token?.id) session.user.id = token.id as any;
      
      // Set other user properties
      if (user?.email) {
        session.user.email = user.email;
      }
      if (user?.name) {
        session.user.name = user.name;
      }
      if (user?.image) {
        session.user.image = user.image;
      }
      
      console.log("Final session:", {
        hasUser: !!session.user,
        userId: session.user?.id,
        userEmail: session.user?.email,
        userName: session.user?.name
      });
      
      return session;
    },
  },
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

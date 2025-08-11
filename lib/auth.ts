import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import OktaProvider from "next-auth/providers/okta";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { prisma } from "./prisma";
import { config } from "./config";

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

// Add Google provider if configured
if (config.google.clientId && config.google.clientSecret) {
  console.log("Adding Google provider");
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
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly"
          ].join(" ")
        }
      }
    })
  );
} else {
  console.log("Google provider not configured:", {
    clientId: !!config.google.clientId,
    clientSecret: !!config.google.clientSecret
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: true,
  callbacks: {
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
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        const verified = (profile as any)?.email_verified ?? true;
        
        if (existing && verified) {
          const linked = await prisma.account.findFirst({
            where: { 
              userId: existing.id, 
              provider: "google", 
              providerAccountId: account.providerAccountId 
            },
          });
          
          if (!linked) {
            await prisma.account.create({
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
          }
          
          // Ensure session uses existing user
          (user as any).id = existing.id;
        }
      }
      
      console.log("Sign-in allowed for:", account?.provider || account?.type);
      return true;
    },
    async session({ session, user }: any) {
      console.log("Session Callback:", { 
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        sessionKeys: session ? Object.keys(session) : []
      });
      
      // Ensure session.user exists and include user ID
      if (!session.user) {
        session.user = {};
      }
      
      // Set user ID from database user
      if (user?.id) {
        session.user.id = user.id;
      }
      
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
    strategy: "database",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

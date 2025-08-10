export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { config } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/config'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const debugInfo: any = {
      note: 'Dynamic debug route; headers allowed.',
      sampleHeaders: Object.fromEntries(req.headers.entries()),
      // Environment variables
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
      },
      
      // Config status
      config: {
        googleClientId: !!config.google.clientId,
        googleClientSecret: !!config.google.clientSecret,
        isGmailEnabled: isFeatureEnabled('gmail'),
        isCalendarEnabled: isFeatureEnabled('calendar'),
      },
      
      // Session info
      session: {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      },
      
      // Database connection
      database: {
        hasConnection: !!config.database.url,
      }
    }

    // If user is authenticated, test Google account connection
    if (session?.user?.id) {
      try {
        const account = await prisma.account.findFirst({
          where: {
            userId: session.user.id,
            provider: "google",
          },
        })
        
        debugInfo.googleAccount = {
          hasAccount: !!account,
          hasAccessToken: !!account?.access_token,
          hasRefreshToken: !!account?.refresh_token,
          expiresAt: account?.expires_at,
          scope: account?.scope,
          providerAccountId: account?.providerAccountId,
        }
        
        // Test Google API if account exists
        if (account?.access_token) {
          try {
            const { google } = await import('googleapis')
            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET
            )
            
            oauth2Client.setCredentials({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expiry_date: account.expires_at ? account.expires_at * 1000 : null,
            })
            
            // Test Gmail API
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
            const gmailResponse = await gmail.users.getProfile({ userId: 'me' })
            
            debugInfo.gmailTest = {
              success: true,
              email: gmailResponse.data.emailAddress,
              messagesTotal: gmailResponse.data.messagesTotal,
              threadsTotal: gmailResponse.data.threadsTotal,
            }
            
            // Test Calendar API
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
            const calendarResponse = await calendar.calendarList.list()
            
            debugInfo.calendarTest = {
              success: true,
              calendarsCount: calendarResponse.data.items?.length || 0,
              primaryCalendar: calendarResponse.data.items?.find(cal => cal.primary)?.summary,
            }
            
          } catch (apiError: any) {
            debugInfo.apiTest = {
              success: false,
              error: apiError.message,
              code: apiError.code,
            }
          }
        }
      } catch (dbError: any) {
        debugInfo.databaseError = {
          error: dbError.message,
        }
      }
    }

    return NextResponse.json(debugInfo)
    
  } catch (error: any) {
    console.error('[debug-google]', error)
    return NextResponse.json(
      { 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    )
  }
}

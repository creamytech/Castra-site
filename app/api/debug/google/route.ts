export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { config, isFeatureEnabled } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'
import { google } from 'googleapis'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    const base: any = {
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      },
      config: {
        gmail: isFeatureEnabled('gmail'),
        calendar: isFeatureEnabled('calendar'),
      },
      session: { userId: session?.user?.id, email: session?.user?.email },
    }

    if (!session?.user?.id) return NextResponse.json({ ...base, note: 'No session' }, { status: 401 })

    const account = await prisma.account.findFirst({ where: { userId: session.user.id, provider: 'google' } })
    base.account = { exists: !!account, hasAccess: !!account?.access_token, hasRefresh: !!account?.refresh_token, scope: account?.scope, expiresAt: account?.expires_at }
    if (!account) return NextResponse.json({ ...base, note: 'No Google account on file' }, { status: 400 })

    // Use helper to handle encrypted tokens and refresh
    const { oauth2 } = await getGoogleAuthForUser(session.user.id)
    const gmail = gmailClient(oauth2)
    const profile = await gmail.users.getProfile({ userId: 'me' })
    base.gmail = { success: true, email: profile.data.emailAddress, messagesTotal: profile.data.messagesTotal, threadsTotal: profile.data.threadsTotal }

    const calendar = google.calendar({ version: 'v3', auth: oauth2 })
    const events = await calendar.events.list({ calendarId: 'primary', singleEvents: true, orderBy: 'startTime', timeMin: new Date().toISOString(), maxResults: 5 })
    base.calendar = { success: true, count: events.data.items?.length || 0, first: events.data.items?.[0]?.summary || null }

    return NextResponse.json(base)
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}

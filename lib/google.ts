import { google } from 'googleapis'
import { prisma } from './prisma'
import { isFeatureEnabled } from './config'

export interface GmailThread {
  id: string
  messages: Array<{
    id: string
    snippet: string
    payload: {
      headers: Array<{ name: string; value: string }>
    }
  }>
}

export interface CalendarEvent {
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  attendees?: Array<{ email: string }>
}

async function getGoogleOAuth(userId: string, sessionTokens?: { accessToken?: string; refreshToken?: string }) {
  if (!isFeatureEnabled('gmail')) {
    throw new Error('Google integration not configured')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  // If session tokens are provided, use them (JWT strategy)
  if (sessionTokens?.accessToken) {
    oauth2Client.setCredentials({
      access_token: sessionTokens.accessToken,
      refresh_token: sessionTokens.refreshToken,
    })
    return oauth2Client
  }

  // Otherwise, try to get from database (fallback for database strategy)
  if (prisma) {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    })

    if (account?.access_token) {
      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
      })
      return oauth2Client
    }
  }

  throw new Error('Google account not connected - no valid tokens found')
}

export async function listRecentThreads(userId: string, maxResults: number = 10, sessionTokens?: { accessToken?: string; refreshToken?: string }) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens)
    const gmail = google.gmail({ version: 'v1', auth })

    const response = await gmail.users.threads.list({
      userId: 'me',
      maxResults,
    })

    return response.data.threads || []
  } catch (error) {
    console.error('Failed to list threads:', error)
    throw new Error('Failed to fetch email threads')
  }
}

export async function getThreadDetail(userId: string, threadId: string, sessionTokens?: { accessToken?: string; refreshToken?: string }): Promise<GmailThread> {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens)
    const gmail = google.gmail({ version: 'v1', auth })

    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
    })

    return response.data as GmailThread
  } catch (error) {
    console.error('Failed to get thread detail:', error)
    throw new Error('Failed to fetch thread details')
  }
}

export async function createDraft(
  userId: string,
  to: string,
  subject: string,
  htmlContent: string,
  sessionTokens?: { accessToken?: string; refreshToken?: string }
) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens)
    const gmail = google.gmail({ version: 'v1', auth })

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent,
    ].join('\n')

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    })

    return response.data
  } catch (error) {
    console.error('Failed to create draft:', error)
    throw new Error('Failed to create email draft')
  }
}

export async function createCalendarEvent(
  userId: string,
  summary: string,
  startISO: string,
  endISO: string,
  attendees: string[] = [],
  sessionTokens?: { accessToken?: string; refreshToken?: string }
) {
  try {
    const auth = await getGoogleOAuth(userId, sessionTokens)
    const calendar = google.calendar({ version: 'v3', auth })

    const event = {
      summary,
      start: { dateTime: startISO, timeZone: 'UTC' },
      end: { dateTime: endISO, timeZone: 'UTC' },
      attendees: attendees.map(email => ({ email })),
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    return response.data
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    throw new Error('Failed to create calendar event')
  }
}

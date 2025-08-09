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

async function getGoogleOAuth(userId: string) {
  if (!isFeatureEnabled('gmail')) {
    throw new Error('Google integration not configured')
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  })

  if (!account?.access_token) {
    throw new Error('Google account not connected')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  return oauth2Client
}

export async function listRecentThreads(userId: string, maxResults: number = 10) {
  try {
    const auth = await getGoogleOAuth(userId)
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

export async function getThreadDetail(userId: string, threadId: string): Promise<GmailThread> {
  try {
    const auth = await getGoogleOAuth(userId)
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
  htmlContent: string
) {
  try {
    const auth = await getGoogleOAuth(userId)
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
  attendees: string[] = []
) {
  try {
    const auth = await getGoogleOAuth(userId)
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

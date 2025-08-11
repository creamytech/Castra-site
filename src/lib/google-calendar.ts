import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function getFreeBusy({ connectionId, timeMin, timeMax }: { connectionId: string; timeMin: string; timeMax: string }) {
  const conn = await (prisma as any).connection.findUnique({ where: { id: connectionId } })
  if (!conn) throw new Error('connection not found')
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ access_token: conn.accessToken, refresh_token: conn.refreshToken, expiry_date: conn.expiresAt ? Number(conn.expiresAt) * 1000 : undefined })
  const calendar = google.calendar({ version: 'v3', auth })
  const { data } = await calendar.freebusy.query({ requestBody: { timeMin, timeMax, items: [{ id: 'primary' }] } })
  const busy = data.calendars?.primary?.busy || []
  return busy.map(b => ({ start: b.start!, end: b.end! }))
}

export async function createEvent({ connectionId, threadId, toEmail, toName, summary, start, end, location, description }: { connectionId: string; threadId?: string; toEmail: string; toName?: string; summary: string; start: string; end: string; location?: string; description?: string }) {
  const conn = await (prisma as any).connection.findUnique({ where: { id: connectionId } })
  if (!conn) throw new Error('connection not found')
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ access_token: conn.accessToken, refresh_token: conn.refreshToken, expiry_date: conn.expiresAt ? Number(conn.expiresAt) * 1000 : undefined })
  const calendar = google.calendar({ version: 'v3', auth })
  const requestBody: any = {
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: [{ email: conn.email }, { email: toEmail, displayName: toName }].filter(Boolean),
    location,
    description,
    conferenceData: { createRequest: { requestId: `castra-${Date.now()}` } }
  }
  const { data } = await calendar.events.insert({ calendarId: 'primary', requestBody, conferenceDataVersion: 1 })
  return { id: data.id!, htmlLink: data.htmlLink || '' }
}



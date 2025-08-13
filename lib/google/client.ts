import { google, gmail_v1, calendar_v3, people_v1 } from 'googleapis'
import { getAccessTokenForUser } from '@/lib/google/exchange'

export type GoogleClients = {
  gmail: gmail_v1.Gmail
  calendar: calendar_v3.Calendar
  people: people_v1.People
}

export async function getGoogleClients(userId: string): Promise<GoogleClients> {
  const { accessToken } = await getAccessTokenForUser(userId)
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )
  oauth2.setCredentials({ access_token: accessToken })
  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2 }),
    calendar: google.calendar({ version: 'v3', auth: oauth2 }),
    people: google.people({ version: 'v1', auth: oauth2 }),
  }
}



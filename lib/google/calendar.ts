import { getCalendarForUser } from '@/lib/google/gmail'

export async function listUpcoming(userId: string, params: { timeMin?: string; timeMax?: string } = {}) {
  const calendar = await getCalendarForUser(userId)
  const res = await calendar.events.list({ calendarId: 'primary', singleEvents: true, orderBy: 'startTime', timeMin: params.timeMin, timeMax: params.timeMax, maxResults: 50 })
  return res.data
}



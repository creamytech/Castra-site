import { prisma } from '@/lib/prisma'
import { createCalendarEvent as createEventGoogle } from '@/lib/google'

export async function findOpenSlots(_userId: string, _durationMinutes = 30): Promise<Array<{ startISO: string; endISO: string }>> {
  // TODO: Implement via Calendar freebusy
  return []
}

export async function createCalendarEvent(userId: string, params: { summary: string; startISO: string; endISO: string; attendees?: Array<{ email: string }>; timeZone?: string; description?: string; location?: string; allDay?: boolean }) {
  const created = await createEventGoogle(userId, params)
  return created
}

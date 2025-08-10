import { prisma } from '@/lib/prisma'
import { createCalendarEvent as createEventGoogle } from '@/lib/google'

export async function findOpenSlots(_userId: string, durationMinutes = 30): Promise<Array<{ startISO: string; endISO: string }>> {
  // Mock: next three days at 3pm local
  const slots: Array<{ startISO: string; endISO: string }> = []
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  for (let i = 1; i <= 3; i++) {
    const start = new Date()
    start.setDate(start.getDate() + i)
    start.setHours(15, 0, 0, 0)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    slots.push({ startISO: start.toISOString(), endISO: end.toISOString() })
  }
  return slots
}

export async function createCalendarEvent(userId: string, params: { summary: string; startISO: string; endISO: string; attendees?: Array<{ email: string }>; timeZone?: string; description?: string; location?: string; allDay?: boolean }) {
  const created = await createEventGoogle(userId, params)
  return created
}

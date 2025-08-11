import OpenAI from 'openai'
import { SchedulingPrefs } from '@/lib/personalization'

export type BusySlot = { start: string; end: string }

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }) : null

function snap(dt: Date): Date {
  const d = new Date(dt)
  const m = d.getMinutes()
  d.setMinutes(m < 30 ? 30 : 60, 0, 0)
  return d
}

function isFree(slot: { start: Date; end: Date }, busy: BusySlot[]) {
  const s = slot.start.getTime(); const e = slot.end.getTime()
  return !busy.some(b => {
    const bs = new Date(b.start).getTime(); const be = new Date(b.end).getTime()
    return Math.max(s, bs) < Math.min(e, be)
  })
}

export async function parseAndProposeTimes(input: { body: string; subject: string; userPrefs: SchedulingPrefs & { styleGuide?: any }; calendarBusy: BusySlot[] }) {
  const tz = input.userPrefs.timeZone || 'America/New_York'
  const sys = `Extract requested date/time windows and a property/address from an email. Return STRICT JSON { detectedProperty: string|null, requestedWindows: [{start,end}] }.`
  let requested: { start: string; end: string }[] = []
  let detectedProperty: string | null = null
  if (client) {
    const content = `Subject: ${input.subject}\n\n${input.body}`
    const resp = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, { role: 'user', content }], temperature: 0.2 })
    try {
      const j = JSON.parse(resp.choices[0]?.message?.content || '{}')
      requested = Array.isArray(j.requestedWindows) ? j.requestedWindows : []
      detectedProperty = j.detectedProperty || null
    } catch {}
  }
  // Propose next 3 free slots within next 3 days, respecting quiet/work hours and snapping
  const now = new Date()
  const proposals: { start: string; end: string }[] = []
  const lenMs = (input.userPrefs.meetingLenMinutes || 60) * 60 * 1000
  const workStart = input.userPrefs.workHours?.start ?? 9
  const workEnd = input.userPrefs.workHours?.end ?? 18
  const quietStart = input.userPrefs.quietHours?.start
  const quietEnd = input.userPrefs.quietHours?.end
  for (let d = 0; d < 3 && proposals.length < 3; d++) {
    const day = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
    for (let hh = workStart; hh <= workEnd - Math.ceil(lenMs / (60*60*1000)); hh += 1) {
      const start = new Date(day)
      start.setHours(hh, 0, 0, 0)
      // snap to :00 or :30
      const snapped = snap(start)
      const end = new Date(snapped.getTime() + lenMs)
      // avoid quiet hours if configured
      const isQuiet = typeof quietStart === 'number' && typeof quietEnd === 'number' && (snapped.getHours() < quietStart || end.getHours() >= quietEnd)
      if (isQuiet) continue
      if (isFree({ start: snapped, end }, input.calendarBusy)) proposals.push({ start: snapped.toISOString(), end: end.toISOString() })
      if (proposals.length >= 3) break
    }
  }

  const draft = `Thanks for reaching out${detectedProperty ? ` about ${detectedProperty}` : ''}. Here are a few times that could work (ET):\n\n${proposals.map((p,i)=>`Option ${i+1}: ${new Date(p.start).toLocaleString('en-US',{ timeZone: tz })}`).join('\n')}\n\nDo any of these work? Happy to suggest alternatives.`
  return { detectedProperty, requestedWindows: requested, proposedWindows: proposals, emailDraft: draft }
}



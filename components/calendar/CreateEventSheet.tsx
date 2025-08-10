"use client"

import { useState } from 'react'

function toRFC3339(dt: Date) {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  const y = dt.getFullYear()
  const m = pad(dt.getMonth() + 1)
  const d = pad(dt.getDate())
  const hh = pad(dt.getHours())
  const mm = pad(dt.getMinutes())
  const ss = pad(dt.getSeconds())
  const tz = -dt.getTimezoneOffset()
  const tzh = pad(Math.floor(Math.abs(tz) / 60))
  const tzm = pad(Math.abs(tz) % 60)
  const sign = tz >= 0 ? '+' : '-'
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${tzh}:${tzm}`
}

export default function CreateEventSheet({ open, onClose, seed }: { open: boolean; onClose: () => void; seed?: { title?: string; date?: string; attendees?: string[] } }) {
  const [title, setTitle] = useState(seed?.title || '')
  const [date, setDate] = useState(seed?.date || '')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [attendees, setAttendees] = useState((seed?.attendees || []).join(','))
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const submit = async () => {
    try {
      setLoading(true)
      const start = new Date(`${date}T${allDay ? '00:00' : startTime}`)
      const end = new Date(`${date}T${allDay ? '23:59' : endTime}`)
      const payload: any = {
        summary: title,
        startISO: toRFC3339(start),
        endISO: toRFC3339(end),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        allDay,
        attendees: attendees.split(',').map(s => s.trim()).filter(Boolean).map(e => ({ email: e }))
      }
      const res = await fetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create event')
      alert('Event created')
      onClose()
    } catch (e: any) {
      alert(e?.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-full max-w-md p-4 bg-background border rounded-lg space-y-3">
        <div className="font-semibold">Create Event</div>
        <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2 items-center">
          <input type="date" className="border rounded px-2 py-1 bg-background" value={date} onChange={e=>setDate(e.target.value)} />
          <label className="text-xs inline-flex items-center gap-1"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)} /> All day</label>
          {!allDay && <input type="time" className="border rounded px-2 py-1 bg-background" value={startTime} onChange={e=>setStartTime(e.target.value)} />}
          {!allDay && <input type="time" className="border rounded px-2 py-1 bg-background" value={endTime} onChange={e=>setEndTime(e.target.value)} />}
        </div>
        <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Attendees (comma-separated emails)" value={attendees} onChange={e=>setAttendees(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border text-xs">Cancel</button>
          <button onClick={submit} disabled={!title || !date || loading} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">{loading ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

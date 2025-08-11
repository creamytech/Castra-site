"use client"

import { useEffect, useMemo, useState } from 'react'

type Draft = {
  id: string
  subject: string
  bodyText: string
  status: string
  createdAt: string
  followupType?: string
  tone?: string
  callToAction?: string
  proposedTimes?: { start: string; end: string }[]
  meta?: any
  lead?: any
  threadId: string
  userId: string
}

export default function DailyBrief() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, { subject: string; bodyText: string }>>({})

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/daily-brief', { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setDrafts(data.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const byDay: Record<string, Draft[]> = {}
    for (const d of drafts) {
      const day = new Date(d.createdAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' })
      byDay[day] = byDay[day] || []
      byDay[day].push(d)
    }
    return byDay
  }, [drafts])

  const send = async (d: Draft) => {
    const payload = editing[d.id] ? editing[d.id] : { subject: d.subject, bodyText: d.bodyText }
    const res = await fetch(`/api/daily-brief/${d.id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) load()
  }
  const snooze = async (d: Draft, minutes = 60) => {
    const res = await fetch(`/api/daily-brief/${d.id}/snooze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes }) })
    if (res.ok) load()
  }
  const dismiss = async (d: Draft) => {
    const res = await fetch(`/api/daily-brief/${d.id}/dismiss`, { method: 'POST' })
    if (res.ok) load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Brief</h1>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        Object.keys(grouped).length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending drafts.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day} className="space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">{day}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((d) => (
                    <div key={d.id} className="p-4 border rounded bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold truncate">{d.subject}</div>
                        <div className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Potential</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(d.lead?.reasons || []).slice(0, 4).join(', ')}{d.lead?.score ? ` • Score ${d.lead.score}` : ''}
                      </div>
                      <textarea
                        className="w-full text-sm p-2 border rounded bg-background"
                        rows={6}
                        defaultValue={d.bodyText}
                        onChange={(e) => setEditing((m) => ({ ...m, [d.id]: { subject: d.subject, bodyText: e.target.value } }))}
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => send(d)} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs">Approve & Send</button>
                        <button onClick={() => snooze(d, 60)} className="px-3 py-1.5 rounded border text-xs">Snooze 1h</button>
                        <button onClick={() => dismiss(d)} className="px-3 py-1.5 rounded border text-xs">Dismiss</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

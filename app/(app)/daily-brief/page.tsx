"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

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
    else setDrafts([])
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 15000); return ()=> clearInterval(t) }, [])

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
        <button onClick={load} className="btn text-sm">Refresh</button>
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
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{d.subject}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{d.lead?.fromName || d.lead?.fromEmail}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-0.5 rounded ${d.lead?.status==='lead' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{(d.lead?.status || 'potential').replace('_',' ')}</div>
                          {typeof d.lead?.score === 'number' && <div className="text-[11px] text-muted-foreground mt-1">Score {d.lead.score}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                        {(d.lead?.reasons || []).slice(0, 3).map((r:string,i:number)=>(<span key={i} className="chip">{r}</span>))}
                        {d.lead?.attrs?.schedule?.requested?.address && <span className="chip">{d.lead.attrs.schedule.requested.address}</span>}
                        {d.lead?.attrs?.price && <span className="chip">${d.lead.attrs.price}</span>}
                      </div>
                      <div className="text-sm line-clamp-3 text-muted-foreground">{d.bodyText?.slice(0,200)}</div>
                      {Array.isArray(d.proposedTimes) && d.proposedTimes.length>0 && (
                        <div className="flex flex-wrap gap-2">
                          {d.proposedTimes.slice(0,3).map((w,i)=>(<span key={i} className="badge">{new Date(w.start).toLocaleString()}–{new Date(w.end).toLocaleTimeString()}</span>))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button onClick={() => send(d)} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs">Approve & Send</button>
                        <button onClick={() => snooze(d, 60)} className="px-3 py-1.5 rounded border text-xs">Snooze 1h</button>
                        <button onClick={() => dismiss(d)} className="px-3 py-1.5 rounded border text-xs">Dismiss</button>
                        <Link href={`/dashboard/inbox/${d.threadId}`} className="px-3 py-1.5 rounded border text-xs">Open Thread</Link>
                      </div>
                      <textarea
                        className="w-full text-sm p-2 border rounded bg-background"
                        rows={6}
                        defaultValue={d.bodyText}
                        onChange={(e) => setEditing((m) => ({ ...m, [d.id]: { subject: d.subject, bodyText: e.target.value } }))}
                      />
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

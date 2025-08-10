"use client"

import { useEffect, useState } from 'react'

export default function DailyBrief() {
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/tasks?status=NEEDS_APPROVAL', { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setDrafts(data.tasks || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approveAll = async () => {
    const res = await fetch('/api/tasks/approve-all', { method: 'POST' })
    if (res.ok) load()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Brief</h1>
        <button onClick={approveAll} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm">Approve All Drafts</button>
      </div>
      <div className="space-y-3">
        <div className="font-semibold text-sm">Pending Drafts</div>
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {drafts.map(d => (
              <div key={d.id} className="p-3 border rounded bg-card text-sm">
                <div className="text-xs text-muted-foreground">{d.type}</div>
                <div className="whitespace-pre-wrap">{d.result?.draft || ''}</div>
              </div>
            ))}
            {drafts.length === 0 && <div className="text-sm text-muted-foreground">No pending drafts.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

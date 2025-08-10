"use client"

import { useEffect, useState } from 'react'

export default function GlobalAgentPanel() {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/tasks?status=NEEDS_APPROVAL', { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setDrafts(data.tasks || [])
    setLoading(false)
  }

  useEffect(() => { if (open) load() }, [open])

  const approveAll = async () => {
    const res = await fetch('/api/tasks/approve-all', { method: 'POST' })
    if (res.ok) load()
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <button onClick={() => setOpen(o => !o)} className="px-3 py-2 rounded bg-card border shadow">Agent</button>
      {open && (
        <div className="mt-2 w-96 p-3 border rounded-lg bg-background shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Agent Panel</div>
            <button onClick={approveAll} className="text-xs underline">Approve all</button>
          </div>
          {loading ? <div className="text-xs text-muted-foreground">Loading…</div> : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {drafts.map(d => (
                <div key={d.id} className="p-2 border rounded text-sm">
                  <div className="text-xs text-muted-foreground">{d.type}</div>
                  <div className="whitespace-pre-wrap">{d.result?.draft || ''}</div>
                </div>
              ))}
              {drafts.length === 0 && <div className="text-xs text-muted-foreground">No drafts pending.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

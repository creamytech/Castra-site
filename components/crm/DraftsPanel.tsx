"use client"

import { useEffect, useState } from 'react'

export default function DraftsPanel({ dealId }: { dealId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/deals/${dealId}/tasks?status=NEEDS_APPROVAL`, { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setTasks(data.tasks || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [dealId])

  const approve = async (taskId: string) => {
    const res = await fetch(`/api/deals/${dealId}/tasks/${taskId}/approve`, { method: 'POST' })
    if (res.ok) load()
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading drafts…</div>

  return (
    <div className="space-y-3">
      {tasks.map(t => (
        <div key={t.id} className="p-3 border rounded-lg bg-card">
          <div className="text-xs text-muted-foreground">{t.type}</div>
          <div className="text-sm whitespace-pre-wrap">{t.result?.draft || ''}</div>
          <div className="pt-2 flex justify-end">
            <button onClick={() => approve(t.id)} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">Approve & Send</button>
          </div>
        </div>
      ))}
      {tasks.length === 0 && <div className="text-sm text-muted-foreground">No drafts requiring approval.</div>}
    </div>
  )
}

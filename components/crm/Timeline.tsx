"use client"

import { useEffect, useState } from 'react'

export default function Timeline({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/deals/${dealId}/activities`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setItems(data.activities || [])
      setLoading(false)
    }
    load()
  }, [dealId])

  if (loading) return <div className="text-sm text-muted-foreground">Loading timeline…</div>

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="p-3 rounded-lg border bg-card">
          <div className="text-xs text-muted-foreground">{new Date(it.occurredAt).toLocaleString()} • {it.channel || it.kind}</div>
          {it.subject && <div className="font-medium text-sm">{it.subject}</div>}
          {it.body && <div className="text-sm whitespace-pre-wrap">{it.body}</div>}
        </div>
      ))}
      {items.length === 0 && <div className="text-sm text-muted-foreground">No interactions yet.</div>}
    </div>
  )
}

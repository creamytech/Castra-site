"use client"

import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r=>r.json())

export default function InboxImportPage() {
  const { data, mutate, isLoading } = useSWR('/api/inbox/threads?limit=50', fetcher)
  const threads = data?.threads || []
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [dealId, setDealId] = useState('')

  const attachSelected = async () => {
    const ids = Object.keys(selected).filter(k=>selected[k])
    if (!dealId || ids.length===0) return
    await Promise.all(ids.map(id=>fetch(`/api/inbox/threads/${id}/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }) })))
    setSelected({}); mutate()
  }

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2">
        <input value={dealId} onChange={e=>setDealId(e.target.value)} placeholder="Deal ID" className="border rounded px-2 py-1 bg-background" />
        <button onClick={attachSelected} className="text-xs px-2 py-1 rounded border">Attach to Deal</button>
      </div>
      <div className="space-y-2">
        {threads.map((t:any)=> (
          <label key={t.id} className="flex items-center gap-2 p-2 border rounded bg-card">
            <input type="checkbox" checked={!!selected[t.id]} onChange={e=>setSelected(s=>({ ...s, [t.id]: e.target.checked }))} />
            <div className="flex-1">
              <div className="font-medium text-sm">{t.subject || '(No subject)'}</div>
              <div className="text-xs text-muted-foreground">{new Date(t.lastSyncedAt).toLocaleString()}</div>
            </div>
          </label>
        ))}
        {threads.length===0 && !isLoading && <div className="text-sm text-muted-foreground">No threads to import</div>}
      </div>
    </div>
  )
}



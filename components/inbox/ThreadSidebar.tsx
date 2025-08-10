"use client"

import { useState } from 'react'

export default function ThreadSidebar({ threadId }: { threadId: string }) {
  const [dealId, setDealId] = useState('')
  const attach = async () => {
    if (!dealId) return
    await fetch(`/api/inbox/threads/${threadId}/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }) })
    alert('Attached')
  }
  return (
    <div className="p-3 border rounded bg-card space-y-2">
      <div className="font-semibold text-sm">Deal</div>
      <div className="flex gap-2">
        <input value={dealId} onChange={e=>setDealId(e.target.value)} placeholder="Deal ID" className="flex-1 border rounded px-2 py-1 bg-background text-sm" />
        <button onClick={attach} className="px-2 py-1 rounded border text-xs">Attach</button>
      </div>
    </div>
  )
}

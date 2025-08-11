"use client"

import { useEffect, useState } from 'react'
import InboxList from '@/components/inbox/InboxList'
import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'

export default function DashboardInboxPage() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [threadId, setThreadId] = useState<string>('')
  // Auto-sync when tab opens
  useEffect(() => { fetch('/api/inbox/sync', { method: 'POST' }) }, [])

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Inbox</div>
          <button
            onClick={async()=>{ await fetch('/api/inbox/sync', { method: 'POST' }); /* SWR list auto-refreshes on focus/interval */ }}
            className="text-xs px-2 py-1 rounded border"
          >Sync</button>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full border rounded px-2 py-1 bg-background" />
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={()=>setFilter('all')} className={`px-2 py-1 rounded border ${filter==='all'?'bg-muted':''}`}>All</button>
          <button onClick={()=>setFilter('hasDeal')} className={`px-2 py-1 rounded border ${filter==='hasDeal'?'bg-muted':''}`}>Has Deal</button>
          <button onClick={()=>setFilter('unlinked')} className={`px-2 py-1 rounded border ${filter==='unlinked'?'bg-muted':''}`}>Unlinked</button>
        </div>
        <InboxList q={q} filter={filter} onSelect={(id)=>setThreadId(id)} />
      </div>
      <div className="md:col-span-3">
        <InboxThread threadId={threadId} />
      </div>
      <div className="md:col-span-1">
        {threadId && <ThreadSidebar threadId={threadId} />}
      </div>
    </div>
  )
}

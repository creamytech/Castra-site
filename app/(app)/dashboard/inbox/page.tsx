"use client"

import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import FiltersSidebar from '@/components/inbox/FiltersSidebar'
import { apiFetch } from '@/lib/http'
import InboxList from '@/components/inbox/InboxList'
import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'

export default function DashboardInboxPage() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [filters, setFilters] = useState<any>({ status: [], minScore: 0, unreadOnly: false, hasPhone: false, hasPrice: false })
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string>('')
  const [threadId, setThreadId] = useState<string>('')
  const { mutate } = useSWRConfig()
  const sync = async () => {
    try {
      setSyncing(true)
      const res = await apiFetch('/api/inbox/sync', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if ((res as any).ok) setToast(`Inbox synced • ${j.synced ?? 0} messages (query: ${j.queryUsed || 'n/a'})`)
      else setToast(`Sync failed: ${j?.detail || j?.error || res.status}`)
      await mutate((key: any) => typeof key === 'string' && key.startsWith('/api/inbox/threads'))
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      console.error('Sync failed', e)
      setToast('Sync failed')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSyncing(false)
    }
  }
  // Auto-sync when tab opens
  useEffect(() => { sync() }, [])

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-1 space-y-3 sticky top-20 self-start">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Inbox</div>
          <button onClick={sync} className="text-xs px-2 py-1 rounded border flex items-center gap-2">
            {syncing && <span className="inline-block w-3 h-3 border-2 border-border border-t-transparent rounded-full animate-spin"/>}
            Sync
          </button>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full border rounded px-2 py-1 bg-background" />
        </div>
        <FiltersSidebar value={filters} onChange={setFilters} />
        <InboxList q={q} filter={filter} onSelect={(id)=>setThreadId(id)} filters={filters} />
        {!!toast && <div className="text-xs text-muted-foreground">{toast}</div>}
      </div>
      <div className="md:col-span-3 min-h-[60vh]">
        <InboxThread threadId={threadId} />
      </div>
      <div className="md:col-span-1">
        {threadId && <ThreadSidebar threadId={threadId} />}
      </div>
    </div>
  )
}

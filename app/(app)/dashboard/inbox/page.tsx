"use client"

import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import FiltersSidebar from '@/components/inbox/FiltersSidebar'
import { apiFetch } from '@/lib/http'
import InboxList from '@/components/inbox/InboxList'
import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'
import SidebarNav from '@/components/inbox/SidebarNav'

export default function DashboardInboxPage() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [folder, setFolder] = useState<'inbox'|'unread'|'starred'|'spam'|'trash'|'drafts'|'all'>('all')
  const [filters, setFilters] = useState<any>({ status: [], minScore: 0, unreadOnly: false, hasPhone: false, hasPrice: false })
  const [category, setCategory] = useState<'primary'|'promotions'|'social'|'updates'|'forums'|'all'>('primary')
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
    <div className="p-0 sm:p-0 grid grid-cols-1 md:grid-cols-5 gap-0">
      <div className="order-1 md:order-none md:col-span-1 space-y-3 md:sticky md:top-16 md:self-start p-4 border-r bg-background/60 backdrop-blur animate-slide-in">
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full border rounded px-2 py-1 bg-background" />
        </div>
        <SidebarNav
          folder={folder}
          onChangeFolder={(f)=>setFolder(f)}
          category={category}
          onChangeCategory={(c)=>setCategory(c)}
          onCompose={()=>setToast('Compose coming soon')}
          syncing={syncing}
          onSync={sync}
        />
        <FiltersSidebar value={filters} onChange={setFilters} />
        <InboxList q={q} filter={filter} onSelect={(id)=>setThreadId(id)} filters={filters} folder={folder} category={category} />
        {!!toast && <div className="text-xs text-muted-foreground">{toast}</div>}
      </div>
      <div className="order-3 md:order-none md:col-span-3 min-h-[60vh] p-4">
        <InboxThread threadId={threadId} />
      </div>
      <div className="order-2 md:order-none md:col-span-1 p-4 bg-card/40 border-l">
        {threadId && <ThreadSidebar threadId={threadId} />}
      </div>
    </div>
  )
}

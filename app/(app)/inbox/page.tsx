"use client"

import { useState } from 'react'
import InboxList from '@/components/inbox/InboxList'
import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'
import { InboxFilterBar, type Status } from '@/components/inbox/InboxNew'
import { Segmented } from '@/components/ui/Segmented'

export default function RealEstateInboxPage() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [threadId, setThreadId] = useState<string>('')
  const [filters, setFilters] = useState<Partial<{ status: Status[]; source: string[]; minScore: number; unreadOnly: boolean; hasPhone: boolean; hasPrice: boolean }>>({})

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-1 space-y-3">
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full border rounded px-2 py-1 bg-background" />
        </div>
        <Segmented options={[{label:'All', value:'all'},{label:'Has Deal', value:'hasDeal'},{label:'Unlinked', value:'unlinked'}]} value={filter} onChange={setFilter} />
        <InboxFilterBar value={filters} onChange={setFilters as any} />
        <InboxList q={q} filter={filter} filters={filters} onSelect={(id)=>setThreadId(id)} selectedId={threadId} />
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

"use client"

import { useState } from 'react'
import InboxList from '@/components/inbox/InboxList'
import BulkActions from '@/components/inbox/BulkActions'
import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'
import { InboxFilterBar, type Status } from '@/components/inbox/InboxNew'
import { Segmented } from '@/components/ui/Segmented'

export default function RealEstateInboxPage() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [threadId, setThreadId] = useState<string>('')
  const [filters, setFilters] = useState<Partial<{ status: Status[]; source: string[]; minScore: number; unreadOnly: boolean; hasPhone: boolean; hasPrice: boolean; hasAttachment: boolean; timeSensitive: boolean }>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toAdvancedQuery = (input: string) => {
    let out = input.trim()
    const lower = out.toLowerCase()
    // time ranges
    if (/(last\s+week)/.test(lower)) out += ' newer_than:7d'
    if (/(last\s+month)/.test(lower)) out += ' newer_than:30d'
    if (/(yesterday)/.test(lower)) out += ' newer_than:1d'
    // attachments
    if (/(with\s+attachments?|has\s+attachments?)/.test(lower) && !/has:attachment/.test(lower)) out += ' has:attachment'
    // from:name/email
    const fromMatch = lower.match(/from\s*:\s*([^\s]+)|from\s+([a-z0-9._%+-]+@[a-z0-9.-]+)/i) || lower.match(/from\s+([a-z]+)\b/)
    if (fromMatch) {
      const who = (fromMatch[1] || fromMatch[2] || '').replace(/[^a-z0-9@._+-]/gi,'')
      if (who) out += ` from:${who}`
    }
    return out.trim()
  }

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-1 space-y-3">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search (try: from:scott has:attachment last:7d)…"
            className="w-full border rounded px-2 py-1 bg-background"
            onKeyDown={(e)=>{
              if (e.key !== 'Enter') return
              // Transform simple natural language to Gmail-ish query then refresh
              const next = toAdvancedQuery(q)
              if (next !== q) setQ(next)
              window.dispatchEvent(new Event('inbox-refresh'))
            }}
          />
        </div>
        <Segmented options={[{label:'All', value:'all'},{label:'Has Deal', value:'hasDeal'},{label:'Unlinked', value:'unlinked'}]} value={filter} onChange={setFilter} />
        <InboxFilterBar value={filters} onChange={setFilters as any} />
        <BulkActions
          selectedCount={selectedIds.length}
          onMarkRead={async ()=>{
            await fetch('/api/inbox', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', ids: selectedIds }) })
            setSelectedIds([])
            window.dispatchEvent(new Event('inbox-refresh'))
          }}
          onMarkUnread={async ()=>{
            await fetch('/api/inbox', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unread', ids: selectedIds }) })
            setSelectedIds([])
            window.dispatchEvent(new Event('inbox-refresh'))
          }}
          onArchive={async ()=>{
            await fetch('/api/inbox', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids: selectedIds }) })
            setSelectedIds([])
            window.dispatchEvent(new Event('inbox-refresh'))
          }}
          onClear={()=>setSelectedIds([])}
        />
        <InboxList
          q={q}
          filter={filter}
          filters={filters}
          onSelect={(id)=>setThreadId(id)}
          selectedId={threadId}
          selectedIds={selectedIds}
          onToggleSelect={(id)=>{
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
          }}
        />
        <button
          className="fixed bottom-6 right-6 md:static md:w-full md:mt-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg"
          onClick={()=>{
            const ev = new CustomEvent('inbox:compose', { detail: {} })
            window.dispatchEvent(ev)
          }}
        >
          Compose
        </button>
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

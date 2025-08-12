"use client"

import useSWR from 'swr'
import { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { apiFetch } from '@/lib/http'
import { STATUS_LABEL, ScoreRing } from './InboxNew'

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

function formatListTime(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const sameYear = d.getFullYear() === now.getFullYear()
  if (sameYear) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString()
}

export default function InboxList({ q, filter, onSelect, filters, folder, category, onItems, selectedId }: { q: string; filter: string; onSelect: (id: string) => void; filters?: any, folder?: string, category?: string, onItems?: (items: any[]) => void, selectedId?: string }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (filter === 'hasDeal') params.set('hasDeal', 'true')
  if (filter === 'unlinked') params.set('hasDeal', 'false')
  if (folder) params.set('folder', folder)
  if (category) params.set('category', category)
  const { data, mutate, isLoading } = useSWR(`/api/inbox/threads?${params.toString()}`, fetcher, { refreshInterval: 15000, revalidateOnFocus: true })
  const threadsRaw = data?.threads || []
  // client-side filter for status/minScore/fields
  let threads = threadsRaw
  if (filters?.status?.length) threads = threads.filter((t: any) => filters.status.includes(t.status))
  if (typeof filters?.minScore === 'number') threads = threads.filter((t: any) => (t.score ?? 0) >= filters.minScore)
  if (filters?.hasPhone) threads = threads.filter((t: any) => !!t.extracted?.phone)
  if (filters?.hasPrice) threads = threads.filter((t: any) => !!t.extracted?.price)
  // Sorting: latest (default), best score
  const sortBy = filters?.sortBy || 'latest'
  if (sortBy === 'latest') {
    threads.sort((a: any, b: any) => new Date(b.lastMessageAt || b.lastSyncedAt).getTime() - new Date(a.lastMessageAt || a.lastSyncedAt).getTime())
  } else if (sortBy === 'score') {
    threads.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
  }

  const rowHeight = 82
  const items = threads
  if (onItems) onItems(items)

  function Row({ index, style }: any) {
    const t: any = items[index]
    if (!t) return null
    return (
      <div style={style}>
        <div
          className={`px-3 py-2 border rounded-lg cursor-pointer flex items-start gap-3 touch-manipulation group transition-transform duration-150 ${t.unread ? 'bg-primary/5 hover:bg-primary/10 border-primary/30' : 'bg-card/90 hover:bg-muted/50'} hover:scale-[1.005]`}
          onClick={() => onSelect(t.id)}
          role="button"
          tabIndex={0}
          aria-selected={selectedId === t.id}
          onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ onSelect(t.id) } }}
        >
          <div className="pt-1 pulse"><ScoreRing score={typeof t.score === 'number' ? t.score : 0} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`truncate ${t.unread ? 'font-semibold' : 'font-medium'}`}>{t.fromName || t.fromEmail || 'Unknown sender'}</div>
              {t.status && (
                <span className="badge rounded-full" data-status={t.status}>
                  {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] || t.status}
                </span>
              )}
              {(t.reasons || []).slice(0, 2).map((r: string, i: number) => (
                <span key={i} className="chip shrink-0 rounded-full bg-background/60">{String(r).toLowerCase()}</span>
              ))}
              <div className="ml-auto text-[10px] text-muted-foreground shrink-0">{formatListTime(t.lastMessageAt || t.lastSyncedAt)}</div>
            </div>
            <div className="text-sm truncate">
              <span className={`${t.unread ? 'font-semibold' : 'font-normal'}`}>{t.subject || '(No subject)'}</span>
              {t.preview && <span className="text-muted-foreground"> — {t.preview}</span>}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 mt-1">
              <button onClick={(e)=>{ e.stopPropagation(); apiFetch(`/api/inbox/threads/${t.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'lead' }) }) }} className="px-1.5 py-0.5 border rounded-full text-xs bg-emerald-500/10 hover:bg-emerald-500/20">✅</button>
              <button onClick={(e)=>{ e.stopPropagation(); apiFetch(`/api/inbox/threads/${t.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'potential' }) }) }} className="px-1.5 py-0.5 border rounded-full text-xs bg-amber-500/10 hover:bg-amber-500/20">⚠️</button>
              <button onClick={(e)=>{ e.stopPropagation(); apiFetch(`/api/inbox/threads/${t.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'no_lead' }) }) }} className="px-1.5 py-0.5 border rounded-full text-xs bg-rose-500/10 hover:bg-rose-500/20">🚫</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      {isLoading && (
        <div className="space-y-2">
          <div className="h-6 rounded skeleton"/>
          <div className="h-6 rounded skeleton"/>
          <div className="h-6 rounded skeleton"/>
        </div>
      )}
      <List height={Math.max(240, typeof window !== 'undefined' ? window.innerHeight - 180 : 480)} itemCount={items.length} itemSize={rowHeight} width={'100%'}>
        {Row}
      </List>
      {threads.length === 0 && !isLoading && (
        <div className="text-sm text-muted-foreground">
          No threads yet. Click Sync to fetch your latest emails.
        </div>
      )}
    </div>
  )
}

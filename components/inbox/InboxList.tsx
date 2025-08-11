"use client"

import useSWR from 'swr'
import { apiFetch } from '@/lib/http'
import { STATUS_LABEL, ScoreRing } from './InboxNew'

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function InboxList({ q, filter, onSelect, filters }: { q: string; filter: string; onSelect: (id: string) => void; filters?: any }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (filter === 'hasDeal') params.set('hasDeal', 'true')
  if (filter === 'unlinked') params.set('hasDeal', 'false')
  const { data, mutate, isLoading } = useSWR(`/api/inbox/threads?${params.toString()}`, fetcher, { refreshInterval: 30000, revalidateOnFocus: true })
  let threads = data?.threads || []
  // client-side filter for status/minScore/fields
  if (filters?.status?.length) threads = threads.filter((t: any) => filters.status.includes(t.status))
  if (typeof filters?.minScore === 'number') threads = threads.filter((t: any) => (t.score ?? 0) >= filters.minScore)
  if (filters?.hasPhone) threads = threads.filter((t: any) => !!t.extracted?.phone)
  if (filters?.hasPrice) threads = threads.filter((t: any) => !!t.extracted?.price)
  // ensure most recent first on client too, in case
  threads.sort((a: any, b: any) => new Date(b.lastMessageAt || b.lastSyncedAt).getTime() - new Date(a.lastMessageAt || a.lastSyncedAt).getTime())

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="space-y-2">
          <div className="h-6 rounded skeleton"/>
          <div className="h-6 rounded skeleton"/>
          <div className="h-6 rounded skeleton"/>
        </div>
      )}
      {threads.map((t: any) => (
        <div
          key={t.id}
          className="p-3 border rounded bg-card hover:bg-muted/50 cursor-pointer flex flex-col gap-1 touch-manipulation"
          onClick={() => onSelect(t.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ onSelect(t.id) } }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ScoreRing score={typeof t.score === 'number' ? t.score : 0} />
            <div className="font-medium text-sm truncate flex-1">{t.subject || '(No subject)'}</div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
            {t.status && (
              <span className="badge" data-status={t.status}>
                {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] || t.status}
              </span>
            )}
            {t.source && <span className="chip">{t.source}</span>}
            {(t.reasons || []).slice(0, 3).map((r: string, i: number) => (
              <span key={i} className="chip shrink-0">{String(r).toLowerCase()}</span>
            ))}
          </div>
          {!!t.preview && <div className="text-xs text-muted-foreground truncate">{t.preview}</div>}
          <div className="text-[10px] text-muted-foreground">{new Date(t.lastMessageAt || t.lastSyncedAt).toLocaleString()}</div>
        </div>
      ))}
      {threads.length === 0 && !isLoading && (
        <div className="text-sm text-muted-foreground">
          No threads yet. Click Sync to fetch your latest emails.
        </div>
      )}
    </div>
  )
}

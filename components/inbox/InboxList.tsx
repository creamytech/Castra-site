"use client"

import useSWR from 'swr'
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

export default function InboxList({ q, filter, onSelect, filters, folder, category }: { q: string; filter: string; onSelect: (id: string) => void; filters?: any, folder?: string, category?: string }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (filter === 'hasDeal') params.set('hasDeal', 'true')
  if (filter === 'unlinked') params.set('hasDeal', 'false')
  if (folder) params.set('folder', folder)
  if (category) params.set('category', category)
  const { data, mutate, isLoading } = useSWR(`/api/inbox/threads?${params.toString()}`, fetcher, { refreshInterval: 30000, revalidateOnFocus: true })
  let threads = data?.threads || []
  // client-side filter for status/minScore/fields
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
          className={`px-3 py-2 border rounded cursor-pointer flex items-start gap-3 touch-manipulation ${t.unread ? 'bg-primary/5 hover:bg-primary/10 border-primary/30' : 'bg-card hover:bg-muted/50'}`}
          onClick={() => onSelect(t.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ onSelect(t.id) } }}
        >
          <div className="pt-1"><ScoreRing score={typeof t.score === 'number' ? t.score : 0} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`truncate ${t.unread ? 'font-semibold' : 'font-medium'}`}>{t.fromName || t.fromEmail || 'Unknown sender'}</div>
              {t.status && (
                <span className="badge" data-status={t.status}>
                  {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] || t.status}
                </span>
              )}
              {t.source && <span className="chip">{t.source}</span>}
              {(t.reasons || []).slice(0, 2).map((r: string, i: number) => (
                <span key={i} className="chip shrink-0">{String(r).toLowerCase()}</span>
              ))}
              <div className="ml-auto text-[10px] text-muted-foreground shrink-0">{formatListTime(t.lastMessageAt || t.lastSyncedAt)}</div>
            </div>
            <div className="text-sm truncate">
              <span className={`${t.unread ? 'font-semibold' : 'font-normal'}`}>{t.subject || '(No subject)'}</span>
              {t.preview && <span className="text-muted-foreground"> — {t.preview}</span>}
            </div>
          </div>
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

"use client"

import useSWR from 'swr'
import { apiFetch } from '@/lib/http'

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function InboxList({ q, filter, onSelect }: { q: string; filter: string; onSelect: (id: string) => void }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (filter === 'hasDeal') params.set('hasDeal', 'true')
  if (filter === 'unlinked') params.set('hasDeal', 'false')
  const { data, mutate, isLoading } = useSWR(`/api/inbox/threads?${params.toString()}`, fetcher, { refreshInterval: 60000, revalidateOnFocus: true })
  const threads = data?.threads || []

  return (
    <div className="space-y-2">
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {threads.map((t: any) => (
        <div key={t.id} className="p-3 border rounded bg-card hover:bg-muted/50 cursor-pointer" onClick={() => onSelect(t.id)}>
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm truncate flex-1">{t.subject || '(No subject)'}</div>
            {t.lastIntent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                {t.lastIntent.replaceAll('_',' ').toLowerCase()}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{new Date(t.lastSyncedAt).toLocaleString()}</div>
        </div>
      ))}
      {threads.length === 0 && !isLoading && <div className="text-sm text-muted-foreground">No threads</div>}
    </div>
  )
}

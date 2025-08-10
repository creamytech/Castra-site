"use client"

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json())

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
          <div className="font-medium text-sm truncate">{t.subject || '(No subject)'}</div>
          <div className="text-xs text-muted-foreground">{new Date(t.lastSyncedAt).toLocaleString()}</div>
        </div>
      ))}
      {threads.length === 0 && !isLoading && <div className="text-sm text-muted-foreground">No threads</div>}
    </div>
  )
}

"use client"

import useSWR from 'swr'
import { useEffect, useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Archive, Star as StarIcon, Paperclip, MailOpen, MoreHorizontal, Reply } from 'lucide-react'
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

export default function InboxList({ q, filter, onSelect, filters, folder, onItems, selectedId, selectedIds = [], onToggleSelect }: { q: string; filter: string; onSelect: (id: string) => void; filters?: any, folder?: string, onItems?: (items: any[]) => void, selectedId?: string, selectedIds?: string[], onToggleSelect?: (id: string, index: number, ev?: { shiftKey?: boolean }) => void }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (filter === 'hasDeal') params.set('hasDeal', 'true')
  if (filter === 'unlinked') params.set('hasDeal', 'false')
  if (folder) params.set('folder', folder)
  const { data, mutate, isLoading } = useSWR(`/api/inbox/threads?${params.toString()}`, fetcher, { refreshInterval: 15000, revalidateOnFocus: true })
  const threadsRaw = data?.threads || []
  // client-side filter for status/minScore/fields
  let threads = threadsRaw
  if (filters?.status?.length) threads = threads.filter((t: any) => filters.status.includes(t.status))
  if (typeof filters?.minScore === 'number') threads = threads.filter((t: any) => (t.score ?? 0) >= filters.minScore)
  if (filters?.hasPhone) threads = threads.filter((t: any) => !!t.extracted?.phone)
  if (filters?.hasPrice) threads = threads.filter((t: any) => !!t.extracted?.price)
  if (filters?.hasAttachment) threads = threads.filter((t: any) => Array.isArray(t.attachments) ? t.attachments.length > 0 : false)
  // Sorting: latest (default), best score
  const sortBy = filters?.sortBy || 'latest'
  if (sortBy === 'latest') {
    threads.sort((a: any, b: any) => new Date(b.lastMessageAt || b.lastSyncedAt).getTime() - new Date(a.lastMessageAt || a.lastSyncedAt).getTime())
  } else if (sortBy === 'score') {
    threads.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
  }

  const rowHeight = (filters?.density || 'comfortable') === 'compact' ? 64 : 88
  const items = threads
  if (onItems) onItems(items)

  // Keyboard shortcuts: j/k navigate, u toggle unread (noop placeholder), e archive (placeholder)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        const idx = Math.max(0, items.findIndex((t:any)=>t.id===selectedId))
        const next = e.key === 'j' ? Math.min(items.length-1, idx+1) : Math.max(0, idx-1)
        const id = items[next]?.id
        if (id) onSelect(id)
      }
      if (e.key === 'u') {
        // optimistic toggle can be added via PATCH
        e.preventDefault()
      }
      if (e.key === 'e') {
        // archive placeholder
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items, selectedId, onSelect])

  function Row({ index, style }: any) {
    const t: any = items[index]
    if (!t) return null
    const isSelected = selectedIds.includes(t.id)
    return (
      <div style={style}>
        <div
          className={`relative pl-2 px-3 py-2 border rounded-lg cursor-pointer flex items-start gap-3 touch-manipulation group transition-transform duration-150 ${t.unread ? 'bg-primary/5 hover:bg-primary/10 border-primary/30' : 'bg-card/90 hover:bg-muted/50'} hover:scale-[1.005] ${isSelected ? 'ring-2 ring-primary/60' : ''}`}
          onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('input,button,textarea,select,a,[data-interactive="true"]')) return; onSelect(t.id) }}
          role="button"
          tabIndex={0}
          aria-selected={selectedId === t.id}
          onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ onSelect(t.id) } }}
        >
          <div className="pt-1 flex items-center gap-2">
            <input type="checkbox" aria-label="Select thread" checked={isSelected}
              onClick={(e)=>e.stopPropagation()}
              onMouseDown={(e)=>e.stopPropagation()}
              onKeyDown={(e)=>e.stopPropagation()}
              onChange={(e)=>{ e.stopPropagation(); onToggleSelect?.(t.id, index, { shiftKey: (e as any).shiftKey }) }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" />
            <ScoreRing score={typeof t.score === 'number' ? t.score : 0} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`truncate ${t.unread ? 'font-semibold' : 'font-medium'}`}>{t.fromName || t.fromEmail || 'Unknown sender'}</div>
              {t.status && (
                <span className="badge rounded-full" data-status={t.status}>
                  {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] || t.status}
                </span>
              )}
              {!!t.labelIds?.includes?.('STARRED') && <StarIcon size={12} className="text-yellow-400" />}
              {!!t.hasAttachment && <Paperclip size={12} className="opacity-60" />}
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
              <button data-interactive="true" title="Reply" onClick={(e)=>{ e.stopPropagation(); onSelect(t.id) }} className="px-2 py-1 border rounded text-xs inline-flex items-center gap-1"><Reply size={12}/> Reply</button>
              <button data-interactive="true" title="Archive" onClick={(e)=>{ e.stopPropagation(); /* todo hook archive */ }} className="px-2 py-1 border rounded text-xs inline-flex items-center gap-1"><Archive size={12}/> Archive</button>
              <button data-interactive="true" title="Mark read" onClick={(e)=>{ e.stopPropagation(); /* optimistic mark read */ }} className="px-2 py-1 border rounded text-xs inline-flex items-center gap-1"><MailOpen size={12}/> Read</button>
              <button data-interactive="true" title="More" onClick={(e)=>{ e.stopPropagation(); }} className="px-2 py-1 border rounded text-xs inline-flex items-center gap-1"><MoreHorizontal size={12}/></button>
            </div>
          </div>
        </div>
        {t.unread && <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l bg-primary/60" aria-hidden></span>}
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

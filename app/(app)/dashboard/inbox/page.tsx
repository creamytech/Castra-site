"use client"

import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import FiltersSidebar from '@/components/inbox/FiltersSidebar'
import { apiFetch } from '@/lib/http'
import InboxList from '@/components/inbox/InboxList'
import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'
import SidebarNav from '@/components/inbox/SidebarNav'

export default function DashboardInboxPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const itemsRef = useRef<any[]>([])
  const [filter, setFilter] = useState('all')
  const [folder, setFolder] = useState<'inbox'|'unread'|'starred'|'spam'|'trash'|'drafts'|'all'>('all')
  const [filters, setFilters] = useState<any>({ status: [], minScore: 0, unreadOnly: false, hasPhone: false, hasPrice: false })
  const [category, setCategory] = useState<'primary'|'promotions'|'social'|'updates'|'forums'|'all'>('primary')
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string>('')
  const [threadId, setThreadId] = useState<string>('')
  const [overlayOpen, setOverlayOpen] = useState<boolean>(false)
  const [summary, setSummary] = useState<string>('')
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false)
  const [showCompose, setShowCompose] = useState<boolean>(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeBusy, setComposeBusy] = useState(false)
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
  // Debounce search
  useEffect(() => {
    const t = setTimeout(()=> setDebouncedQ(q), 250)
    return ()=> clearTimeout(t)
  }, [q])
  // Keyboard shortcuts (list/thread + command palette/search)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Slash focuses search
      if ((e.key === '/' || (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') && !overlayOpen) {
        e.preventDefault()
        const input = document.querySelector('input[aria-label="Search inbox"]') as HTMLInputElement | null
        input?.focus()
        return
      }
      if (!overlayOpen) {
        if (e.key.toLowerCase()==='j' || e.key.toLowerCase()==='k') {
          e.preventDefault()
          const list = itemsRef.current
          const idx = list.findIndex(t=>t.id===threadId)
          const nextIdx = e.key.toLowerCase()==='j' ? Math.min(list.length-1, idx+1) : Math.max(0, idx-1)
          const next = list[nextIdx]
          if (next) openThread(next.id)
        }
      } else {
        const lower = e.key.toLowerCase()
        if (lower==='escape') { closeThread(); return }
        if (['l','p','n','s'].includes(lower)) {
          e.preventDefault()
          if (!threadId) return
          if (lower==='s') {
            // Snooze: best-effort; UI page will pick current draft
            fetch('/api/daily-brief', { method:'GET', credentials:'include' })
          } else {
            const map: any = { l: 'lead', p: 'potential', n: 'no_lead' }
            apiFetch(`/api/inbox/threads/${threadId}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: map[lower] }) })
          }
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          const btn = document.querySelector('#smart-reply-send') as HTMLButtonElement | null
          btn?.click()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  }, [overlayOpen, threadId])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(()=> setDebouncedQ(q), 250)
    return ()=> clearTimeout(t)
  }, [q])

  // When a thread opens, fetch AI summary
  useEffect(() => {
    const run = async () => {
      if (!threadId) return
      try {
        setLoadingSummary(true)
        const res = await apiFetch('/api/email/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId }) })
        const j = await res.json().catch(()=>({}))
        if ((res as any).ok && j.summary) setSummary(j.summary)
      } catch {}
      finally { setLoadingSummary(false) }
    }
    run()
  }, [threadId])

  const openThread = (id: string) => { setThreadId(id); setOverlayOpen(true) }
  const closeThread = () => { setOverlayOpen(false); setThreadId(''); setSummary('') }

  const doComposeSend = async () => {
    try {
      setComposeBusy(true)
      // Create draft
      const res = await apiFetch('/api/email/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: composeTo, subject: composeSubject, content: composeBody }) })
      const j = await res.json()
      if (!(res as any).ok) throw new Error(j?.error || 'Failed to draft')
      const draftId = j.draftId
      if (!draftId) throw new Error('No draftId')
      // Send draft
      const send = await apiFetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftId }) })
      if (!(send as any).ok) throw new Error('Failed to send')
      setShowCompose(false); setComposeTo(''); setComposeSubject(''); setComposeBody('')
      setToast('Sent')
      setTimeout(()=>setToast(''), 2000)
    } catch (e) {
      setToast('Compose failed')
      setTimeout(()=>setToast(''), 2500)
    } finally {
      setComposeBusy(false)
    }
  }

  return (
    <>
    <div className="p-0 sm:p-0 grid grid-cols-1 md:grid-cols-5 gap-0">
      <div className="order-1 md:order-none md:col-span-1 space-y-3 md:sticky md:top-16 md:self-start p-4 border-r bg-background/60 backdrop-blur animate-slide-in">
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full border rounded px-3 py-2 bg-background" aria-label="Search inbox" />
        </div>
        <SidebarNav
          folder={folder}
          onChangeFolder={(f)=>setFolder(f)}
          category={category}
          onChangeCategory={(c)=>setCategory(c)}
          onCompose={()=>setShowCompose(true)}
          syncing={syncing}
          onSync={sync}
        />
        <FiltersSidebar value={filters} onChange={setFilters} />
        {/* Middle list lives in the center column; keep sidebar lean */}
        {!!toast && <div className="text-xs text-muted-foreground">{toast}</div>}
      </div>
      <div className="order-3 md:order-none md:col-span-3 min-h-[70vh] p-4 relative">
        {/* Email list column */}
        <div className="space-y-2">
          <InboxList q={debouncedQ} filter={filter} onSelect={openThread} filters={filters} folder={folder} category={category} selectedId={threadId} onItems={(it)=>{ itemsRef.current = it }} />
        </div>
        {/* Overlay detail replaces the list until closed */}
        {overlayOpen && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur border rounded-md shadow-lg animate-slide-in overflow-hidden flex flex-col">
            <div className="p-3 border-b flex items-center gap-2">
              <button onClick={closeThread} className="px-2 py-1 text-xs border rounded">Back</button>
              <div className="ml-2 text-sm text-muted-foreground">AI Summary</div>
              <div className="ml-2 text-xs text-muted-foreground truncate flex-1">
                {loadingSummary ? 'Summarizing…' : (summary || 'No summary yet')}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <InboxThread threadId={threadId} />
            </div>
          </div>
        )}
      </div>
      <div className="order-2 md:order-none md:col-span-1 p-4 bg-card/40 border-l">
        {threadId && <ThreadSidebar threadId={threadId} />}
      </div>
    </div>

    {/* Compose overlay */}
    {showCompose && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="w-full max-w-xl bg-card border rounded-md shadow-xl animate-scale-in p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Compose</div>
            <button onClick={()=>setShowCompose(false)} className="text-xs border rounded px-2 py-1">Close</button>
          </div>
          <input value={composeTo} onChange={e=>setComposeTo(e.target.value)} placeholder="To" className="w-full border rounded px-2 py-1 bg-background" />
          <input value={composeSubject} onChange={e=>setComposeSubject(e.target.value)} placeholder="Subject" className="w-full border rounded px-2 py-1 bg-background" />
          <textarea value={composeBody} onChange={e=>setComposeBody(e.target.value)} placeholder="Message" className="w-full h-48 border rounded px-2 py-1 bg-background" />
          <div className="flex justify-end gap-2">
            <button onClick={()=>setShowCompose(false)} className="px-3 py-1 text-xs border rounded">Cancel</button>
            <button disabled={!composeTo||!composeSubject||!composeBody||composeBusy} onClick={doComposeSend} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground">
              {composeBusy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

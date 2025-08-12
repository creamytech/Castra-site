"use client"

import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
// Removed legacy FiltersSidebar
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
  const [folder, setFolder] = useState<'inbox'|'unread'|'starred'|'spam'|'trash'|'drafts'|'archived'|'all'>('all')
  const [filters, setFilters] = useState<any>({ status: [], minScore: 0, unreadOnly: false, hasPhone: false, hasPrice: false })
  // Categories removed; filter dropdown will be used instead
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string>('')
  const [threadId, setThreadId] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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

  // Batch triage: process 10
  useEffect(() => {
    const onQuick = (e: any) => {
      const { action, threadId: tid } = e.detail || {}
      if (!action) return
      if (action.type === 'propose_times') {
        openThread(tid)
        setTimeout(()=>{
          const draft = `Hi! Here are a few times I’m available for a showing this week:\n- Tue 3-5pm\n- Wed 11am-1pm\n- Thu 4-6pm\nLet me know what works best, or share some times that work for you.`
          const evt = new CustomEvent('inbox:prefill-draft', { detail: { threadId: tid, draft } })
          window.dispatchEvent(evt)
        }, 250)
      }
      if (action.type === 'send_preapproval') {
        openThread(tid)
        setTimeout(()=>{
          const evt = new CustomEvent('inbox:prefill-draft', { detail: { threadId: tid, draft: 'Happy to help with pre-approval. I can connect you with a trusted local lender and outline the documents needed (income verification, bank statements, credit report). Would you like me to introduce you via email? Also, what price range are you targeting?' } })
          window.dispatchEvent(evt)
        }, 250)
      }
      if (action.type === 'start_cma') {
        // Open deals or reports page in a new tab
        window.open('/reports?tab=cma&from=inbox', '_blank')
      }
    }
    window.addEventListener('inbox:quick-action', onQuick as any)
    return ()=> window.removeEventListener('inbox:quick-action', onQuick as any)
  }, [])

  const [batchMode, setBatchMode] = useState(false)
  const [batchIndex, setBatchIndex] = useState(0)
  const startBatch = () => { setBatchMode(true); setBatchIndex(0); if (itemsRef.current[0]) openThread(itemsRef.current[0].id) }
  const nextBatchItem = () => { const next = itemsRef.current[batchIndex+1]; if (next) { setBatchIndex(batchIndex+1); openThread(next.id) } }

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

  // Bulk selection with shift support
  const lastIndexRef = useRef<number>(-1)
  const toggleSelect = (id: string, index: number, ev?: { shiftKey?: boolean }) => {
    setSelectedIds(prev => {
      const has = prev.includes(id)
      let next = has ? prev.filter(x=>x!==id) : [...prev, id]
      if (ev?.shiftKey && lastIndexRef.current >= 0 && itemsRef.current.length) {
        const start = Math.min(lastIndexRef.current, index)
        const end = Math.max(lastIndexRef.current, index)
        const range = itemsRef.current.slice(start, end+1).map((t:any)=>t.id)
        const set = new Set(next)
        range.forEach(i=> set.add(i))
        next = Array.from(set)
      }
      lastIndexRef.current = index
      return next
    })
  }

  const clearSelection = () => setSelectedIds([])

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
        <div className="flex gap-2 items-center">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full border rounded px-3 py-2 bg-background" aria-label="Search inbox" />
          {/* Sort dropdown */}
          <select className="px-3 py-2 text-xs border rounded bg-background" value={filters.sortBy||'latest'} onChange={e=>setFilters((f:any)=>({ ...f, sortBy: e.target.value }))} aria-label="Sort">
            <option value="latest">Latest</option>
            <option value="score">Score</option>
          </select>
          <details className="relative">
            <summary className="list-none px-3 py-2 text-xs rounded border cursor-pointer hover:bg-accent/50">Filters</summary>
            <div className="absolute right-0 mt-2 w-80 p-3 bg-popover border rounded shadow-lg space-y-2 z-20">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs"><input type="checkbox" checked={filters.unreadOnly||false} onChange={e=>setFilters((f:any)=>({ ...f, unreadOnly: e.target.checked }))} /> Unread only</div>
                <div></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['lead','potential','follow_up','no_lead'].map(s => (
                    <label key={s} className="inline-flex items-center gap-1"><input type="checkbox" checked={Array.isArray(filters.status) && filters.status.includes(s)} onChange={(e)=>{
                      setFilters((cur:any)=>{ const set = new Set(cur.status||[]); e.target.checked ? set.add(s) : set.delete(s); return { ...cur, status: Array.from(set) } })
                    }} /> {s.replace('_',' ')}</label>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t mt-2">
                <label className="text-xs text-muted-foreground">Density</label>
                <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                  {['comfortable','compact'].map(d => (
                    <label key={d} className="inline-flex items-center gap-2">
                      <input type="radio" name="density" checked={(filters.density||'comfortable')===d} onChange={()=>setFilters((f:any)=>({ ...f, density: d }))} /> {d}
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button className="px-2 py-1 text-xs border rounded" onClick={()=>{
                    const payload = { key: 'inbox:filters', value: JSON.stringify(filters) }
                    fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  }}>Save view</button>
                  <button className="px-2 py-1 text-xs border rounded" onClick={async()=>{
                    const r = await fetch('/api/memory?keys=inbox:filters')
                    const j = await r.json().catch(()=>({}))
                    const v = j?.memories?.[0]?.value
                    if (typeof v === 'string') {
                      try { const parsed = JSON.parse(v); setFilters((f:any)=>({ ...f, ...parsed })) } catch {}
                    }
                  }}>Load view</button>
                </div>
              </div>
            </div>
          </details>
        </div>
        <SidebarNav
          folder={folder}
          onChangeFolder={(f)=>setFolder(f)}
          onCompose={()=>setShowCompose(true)}
          syncing={syncing}
          onSync={sync}
        />
        {/* FiltersSidebar removed per design */}
        {/* Middle list lives in the center column; keep sidebar lean */}
        {!!toast && <div className="text-xs text-muted-foreground">{toast}</div>}
      </div>
      <div className="order-3 md:order-none md:col-span-3 min-h-[70vh] p-4 relative">
        {/* Email list column */}
        <div className="space-y-2">
          <InboxList q={debouncedQ} filter={filter} onSelect={openThread} filters={filters} folder={folder} selectedId={threadId} selectedIds={selectedIds} onToggleSelect={toggleSelect} onItems={(it)=>{ itemsRef.current = it }} />
        </div>
        {selectedIds.length > 0 && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-30 px-3 py-2 rounded-full border bg-popover shadow-lg flex items-center gap-2 text-xs">
            <div>{selectedIds.length} selected</div>
            <button className="px-2 py-1 border rounded" onClick={clearSelection}>Clear</button>
            <button className="px-2 py-1 border rounded" onClick={async()=>{ await apiFetch('/api/inbox/threads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds, action: 'archive' }) }); clearSelection(); }}>Archive</button>
            <button className="px-2 py-1 border rounded" onClick={async()=>{ await apiFetch('/api/inbox/threads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds, action: 'read' }) }); clearSelection(); }}>Mark read</button>
            <button className="px-2 py-1 border rounded" onClick={()=>{/* TODO: move */}}>Move</button>
          </div>
        )}
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
        {/* Global inbox sidebar now always shows AI assistant, not only within a thread */}
        <ThreadSidebar threadId={threadId || ''} />
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-1">Agent</div>
          <div className="border rounded p-2 space-y-2 text-xs">
            <div className="text-sm font-medium">Ask the Inbox Agent</div>
            <div className="text-muted-foreground">Examples: “show hot leads over 80”, “open thread with tour request”, “draft follow-up”.</div>
            <form onSubmit={async (e)=>{ e.preventDefault(); const v = (document.getElementById('agent-q') as HTMLInputElement)?.value||''; if (!v) return; const r = await fetch('/api/inbox/agent', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: v }) }); const j = await r.json().catch(()=>({})); const first = (j?.suggestions||[]).find((s:any)=>s.type==='filter'); if (first) setFilters((f:any)=>({ ...f, ...first.filters })); const opener = (j?.suggestions||[]).find((s:any)=>s.type==='open'); if (opener) openThread(opener.threadId); }} className="flex gap-2">
              <input id="agent-q" className="flex-1 border rounded px-2 py-1 bg-background" placeholder="Find leads…" />
              <button className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">Ask</button>
            </form>
            <div className="flex gap-1 flex-wrap">
              <button className="px-2 py-1 border rounded" onClick={async()=>{ const r = await fetch('/api/inbox/agent', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'draft a follow-up' }) }); const j = await r.json().catch(()=>({})); const d = (j?.suggestions||[]).find((s:any)=>s.type==='draft'); if (d) { openThread(d.threadId); setTimeout(async()=>{ const res = await fetch(`/api/inbox/messages/${d.messageId}/ai-draft`, { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tone: 'friendly' }) }); const jr = await res.json().catch(()=>({})); if ((res as any).ok) { const evt = new CustomEvent('inbox:prefill-draft', { detail: { threadId: d.threadId, subject: jr.subject, draft: jr.draft } }); window.dispatchEvent(evt); } }, 250); } }}>Draft follow-up</button>
            </div>
          </div>
        </div>
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

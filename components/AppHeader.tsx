'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Breadcrumbs from './Breadcrumbs'
import NotificationsBell from './NotificationsBell'
import { UserMenu } from './user-menu'
import ThemeToggle from '@/components/ThemeToggle'

function useKey(key: string, handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const cmdK = (key === 'mod+k') && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && e.key.toLowerCase() === 'k'
      const slash = key === '/' && e.key === '/'
      if (cmdK || slash) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler])
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(()=>{ if (open) setTimeout(()=>inputRef.current?.focus(), 10) }, [open])
  const actions = [
    { group: 'Create', label: 'New Email', href: '/dashboard/inbox' },
    { group: 'Create', label: 'New Task', href: '/dashboard' },
    { group: 'Create', label: 'New Deal', href: '/app/crm' },
    { group: 'Navigate', label: 'Inbox', href: '/dashboard/inbox' },
    { group: 'Navigate', label: 'Deals', href: '/app/crm' },
    { group: 'Navigate', label: 'Calendar', href: '/app/calendar' },
  ]
  const [q, setQ] = useState('')
  const filtered = useMemo(()=>actions.filter(a=>a.label.toLowerCase().includes(q.toLowerCase())), [q])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-24 w-full max-w-xl rounded-xl border bg-background shadow-xl" onClick={(e)=>e.stopPropagation()}>
        <div className="px-4 py-3 border-b">
          <input ref={inputRef} value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Type a command or search…" className="w-full bg-transparent outline-none" />
        </div>
        <div className="max-h-80 overflow-auto py-2">
          {filtered.length ? (
            filtered.map((a, i)=> (
              <a key={i} href={a.href} onClick={onClose} className="block px-4 py-2 hover:bg-muted">
                <div className="text-xs text-muted-foreground">{a.group}</div>
                <div>{a.label}</div>
              </a>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">No results</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConnectionStatusPill() {
  const [status, setStatus] = useState<{ connected: boolean; reason?: string } | null>(null)
  useEffect(()=>{
    let mounted = true
    fetch('/api/integrations/google/status', { cache: 'no-store' })
      .then(r=>r.json()).then(d=>{ if (mounted) setStatus(d) }).catch(()=>setStatus({ connected: false, reason: 'error' }))
    return ()=>{ mounted = false }
  }, [])
  const color = status?.connected ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
  const label = status?.connected ? 'Google Connected' : `Google: ${status?.reason || 'not connected'}`
  return (
    <button onClick={()=>{ if (!status?.connected) window.location.href = '/dashboard/connect' }}
      className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${color}`}>
      {label}
    </button>
  )
}

function QuickCreate() {
  const items = [
    { label: 'Compose Email', href: '/dashboard/inbox' },
    { label: 'New Task', href: '/dashboard' },
    { label: 'New Deal', href: '/app/crm' },
    { label: 'New Contact', href: '/app/crm' },
  ]
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={()=>setOpen(!open)} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">+ New</button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border bg-background shadow-md z-50">
          {items.map((it,i)=>(
            <a key={i} href={it.href} className="block px-3 py-2 text-sm hover:bg-muted" onClick={()=>setOpen(false)}>{it.label}</a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppHeader() {
  const { data: session } = useSession()
  const [syncing, setSyncing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [paletteOpen, setPaletteOpen] = useState(false)

  useKey('mod+k', ()=>setPaletteOpen(true))
  useKey('/', ()=>setPaletteOpen(true))

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date().toLocaleTimeString()), 60000)
    setLastUpdated(new Date().toLocaleTimeString())
    return () => clearInterval(id)
  }, [])

  const doRefresh = async () => {
    try {
      setSyncing(true)
      await fetch('/api/inbox/sync', { method: 'POST' }).catch(()=>{})
      setLastUpdated(new Date().toLocaleTimeString())
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} />
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <a href="/dashboard" className="font-semibold hidden sm:block">Castra</a>
            <div className="hidden md:block"><Breadcrumbs /></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPaletteOpen(true)} className="hidden md:flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted" aria-label="Search or command (Cmd/Ctrl+K)">
              <span className="text-muted-foreground">Search or command</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border">⌘K</kbd>
            </button>
            <ConnectionStatusPill />
            <QuickCreate />
            <div className="text-xs text-muted-foreground hidden sm:block">
              {syncing ? 'Syncing…' : lastUpdated ? `Updated ${lastUpdated}` : ''}
            </div>
            <button onClick={doRefresh} className="text-xs px-2 py-1 rounded border hover:bg-muted" disabled={syncing}>
              {syncing ? 'Refreshing…' : 'Refresh'}
            </button>
            <NotificationsBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  )
}

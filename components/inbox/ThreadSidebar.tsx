"use client"

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { apiFetch } from '@/lib/http'
import { STATUS_LABEL } from './InboxNew'

async function createDealFromThread(threadId: string) {
  const res = await apiFetch(`/api/inbox/threads/${threadId}/create-deal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  return res.json()
}

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function ThreadSidebar({ threadId }: { threadId?: string }) {
  const [dealId, setDealId] = useState('')
  const { data } = useSWR(threadId ? `/api/inbox/threads/${threadId}` : null, fetcher)
  const thread = data?.thread
  const lastId = thread?.messages?.slice(-1)?.[0]?.id
  const [draft, setDraft] = useState('')
  const [agentQ, setAgentQ] = useState('')
  const [agentA, setAgentA] = useState('')
  const runAi = async () => {
    if (!lastId) return
    const res = await apiFetch(`/api/inbox/messages/${lastId}/ai-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const j = await res.json(); if (res.ok) setDraft(j.draft || '')
  }
  // Listen for suggest reply from header or list (single listener per mount)
  useEffect(() => {
    const handler = async () => {
      try {
        const msgId = lastId
        if (!msgId) return
        await apiFetch('/api/email/smart-replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msgId }) })
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Generating AI reply…' } }))
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('inbox:suggest-reply', handler as any)
      return () => window.removeEventListener('inbox:suggest-reply', handler as any)
    }
  }, [lastId])
  const send = async () => {
    if (!lastId) return
    const to = (thread?.messages?.slice(-1)?.[0]?.from || '').match(/<?([^<>\s@]+@[^<>\s]+)>?/)?.[1] || ''
    const subject = thread?.subject ? `Re: ${thread.subject}` : 'Quick follow-up'
    await apiFetch(`/api/inbox/messages/${lastId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', to, subject, draft, dealId }) })
    setDraft('')
  }
  const attach = async () => {
    if (!dealId) return
    await apiFetch(`/api/inbox/threads/${threadId}/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }) })
    alert('Attached')
  }
  const [proposed, setProposed] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const suggestSlots = async () => {
    try {
      setCreating(true)
      const now = new Date(); const in3d = new Date(now.getTime() + 3*24*60*60*1000)
      const res = await apiFetch('/api/calendar/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ window: `${now.toISOString()}..${in3d.toISOString()}` }) })
      const j = await res.json(); if ((res as any).ok) setProposed(j.slots || [])
    } finally { setCreating(false) }
  }
  const createEvent = async (slot: string) => {
    try {
      setCreating(true)
      const start = new Date(slot); const end = new Date(start.getTime() + 60*60*1000)
      const to = (thread?.messages?.slice(-1)?.[0]?.from || '').match(/<?([^<>\n+\s@]+@[^<>\n+\s]+)>?/)?.[1] || ''
      const res = await apiFetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: thread?.subject || 'Showing', description: 'Proposed by Castra', start: start.toISOString(), end: end.toISOString(), timeZone: 'America/New_York', attendees: to ? [to] : [] }) })
      if ((res as any).ok) { alert('Event created'); setProposed([]) }
    } finally { setCreating(false) }
  }
  const createDeal = async () => {
    if (!threadId) return
    const r = await createDealFromThread(threadId)
    if (r?.deal?.id) {
      setDealId(r.deal.id)
      alert('Deal created from thread')
    }
  }
  // Deal visuals
  const deal = (thread as any)?.deal
  const dealInitial = (deal?.title || deal?.clientName || '?').slice(0,1)
  const dealStage = deal?.stage || 'LEAD'
  const dealDeadline = deal?.nextDue || deal?.closeDate || null
  const STAGE_COLORS: Record<string, string> = {
    LEAD: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    QUALIFIED: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    SHOWING: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
    OFFER: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    ESCROW: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/30',
    CLOSED: 'bg-emerald-700/20 text-emerald-300 border-emerald-600/40',
    LOST: 'bg-rose-600/20 text-rose-300 border-rose-500/40',
  }
  const stageClass = STAGE_COLORS[dealStage] || 'bg-muted text-muted-foreground border-muted'

  // Mini calendar state
  const [monthStart, setMonthStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('09:00')
  const days = useMemo(() => {
    const firstDay = new Date(monthStart)
    const startDayIdx = firstDay.getDay() // 0-6
    const gridStart = new Date(firstDay)
    gridStart.setDate(firstDay.getDate() - startDayIdx)
    const arr: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [monthStart])

  const createSelectedEvent = async () => {
    if (!selectedDate) return
    const [h, m] = selectedTime.split(':').map(n => parseInt(n, 10))
    const start = new Date(selectedDate)
    start.setHours(h, m, 0, 0)
    await createEvent(start.toISOString())
  }

  return (
    <div className="p-3 border rounded bg-card space-y-3">
      {/* Deal visuals card */}
      {deal && (
        <div className="p-3 rounded border bg-background/60">
          <div className="flex items-center gap-3">
            {/* Logo placeholder / avatar */}
            {deal?.clientLogoUrl ? (
              <img src={deal.clientLogoUrl} alt="" className="w-8 h-8 rounded object-cover ring-1 ring-border" />
            ) : (
              <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/40 to-primary grid place-items-center text-xs font-bold">
                {dealInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" title={deal.title}>{deal.title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{deal.propertyAddr || deal.city || deal.clientName || ''}</div>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${stageClass}`} title="Stage">{dealStage}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <div>Value {deal.value ? `$${Number(deal.value).toLocaleString()}` : (deal.priceTarget ? `$${Number(deal.priceTarget).toLocaleString()}` : '—')}</div>
            {dealDeadline && <div>Due {new Date(dealDeadline).toLocaleDateString()}</div>}
          </div>
          {/* CTA chips */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button onClick={(e)=>{ e.stopPropagation(); if (thread?.id) window.location.href = `/dashboard/inbox/${thread.id}` }} className="text-[11px] px-2 py-1 rounded-full border bg-muted/50 hover:bg-muted/70">Open thread</button>
            <button onClick={(e)=>{ e.stopPropagation(); if (deal?.id) window.location.href = `/crm/deals/${deal.id}` }} className="text-[11px] px-2 py-1 rounded-full border bg-muted/50 hover:bg-muted/70">Open deal</button>
            <button onClick={(e)=>{ e.stopPropagation(); suggestSlots() }} className="text-[11px] px-2 py-1 rounded-full border bg-muted/50 hover:bg-muted/70">Propose times</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">AI Assistant</div>
        {thread?.status && (
          <div className="text-xs">
            <span className="badge" data-status={thread.status}>{STATUS_LABEL[thread.status as keyof typeof STATUS_LABEL] || thread.status}</span>
            {typeof thread.score === 'number' && <span className="chip" style={{ marginLeft: 6 }}>Score {thread.score}</span>}
          </div>
        )}
      </div>
      <div className="font-semibold text-sm">Deal</div>
      <div className="flex gap-2">
        <input value={dealId} onChange={e=>setDealId(e.target.value)} placeholder="Deal ID" className="flex-1 border rounded px-2 py-1 bg-background text-sm" />
        <button onClick={attach} className="px-2 py-1 rounded border text-xs">Attach</button>
      </div>
      <button onClick={createDeal} className="px-2 py-1 rounded border text-xs w-full">+ New Deal from email</button>

      <div className="pt-2 border-t space-y-2">
        <button onClick={runAi} disabled={!lastId} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs w-full disabled:opacity-50">AI Draft</button>
        {draft && (
          <>
            <textarea className="w-full border rounded bg-background p-2 text-sm" rows={5} value={draft} onChange={(e)=>setDraft(e.target.value)} />
            <button onClick={send} className="px-2 py-1 rounded border text-xs w-full">Send</button>
          </>
        )}
        <div className="pt-2 space-y-2">
          <div className="text-xs text-muted-foreground">Ask about your inbox. The assistant can reference recent messages and return thread links.</div>
          <div className="flex gap-2">
            <input value={agentQ} onChange={e=>setAgentQ(e.target.value)} placeholder="Ask about an email…" className="flex-1 border rounded px-2 py-1 bg-background text-sm" />
            <button
              onClick={async()=>{
                if (!agentQ) return
                const res = await apiFetch('/api/inbox/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: agentQ }) })
                const j = await res.json(); if ((res as any).ok) setAgentA(j.content || '')
              }}
              className="px-2 py-1 rounded border text-xs"
            >Ask</button>
          </div>
          {agentA && (
            <div className="text-xs whitespace-pre-wrap border rounded p-2 bg-muted/40">{agentA}</div>
          )}
        </div>
      </div>
      <div className="pt-2 border-t space-y-2">
        <div className="font-semibold text-sm">Schedule</div>
        {/* Mini calendar */}
        <div className="rounded border bg-background/60 p-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <button className="px-1 py-0.5 border rounded" onClick={()=>setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth()-1, 1))}>{'<'}</button>
            <div className="font-medium">{monthStart.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <button className="px-1 py-0.5 border rounded" onClick={()=>setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth()+1, 1))}>{'>'}</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-muted-foreground mb-1">
            {['S','M','T','W','T','F','S'].map((d)=> <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i)=>{
              const inMonth = d.getMonth() === monthStart.getMonth()
              const isSel = selectedDate && d.toDateString() === selectedDate.toDateString()
              return (
                <button key={i} onClick={()=>setSelectedDate(new Date(d))} className={`text-xs px-1 py-1 rounded border ${isSel ? 'bg-primary/20 border-primary' : 'bg-transparent'} ${inMonth ? '' : 'opacity-40'}`}>{d.getDate()}</button>
              )
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select value={selectedTime} onChange={(e)=>setSelectedTime(e.target.value)} className="flex-1 border rounded px-2 py-1 bg-background text-xs">
              {['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'].map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={createSelectedEvent} disabled={!selectedDate || creating} className="px-2 py-1 rounded border text-xs">Propose</button>
          </div>
        </div>
        <button onClick={suggestSlots} disabled={creating} className="px-2 py-1 rounded border text-xs w-full">Suggest Times</button>
        <div className="space-y-1">
          {proposed.map((s)=> (
            <div key={s} className="flex items-center justify-between text-xs border rounded px-2 py-1">
              <span>{new Date(s).toLocaleString()}</span>
              <button onClick={()=>createEvent(s)} className="px-2 py-0.5 border rounded">Create</button>
            </div>
          ))}
          {!proposed.length && <div className="text-xs text-muted-foreground">No proposals yet</div>}
        </div>
      </div>
    </div>
  )
}

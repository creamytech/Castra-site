"use client"

import { useState } from 'react'
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
    const r = await createDealFromThread(threadId)
    if (r?.deal?.id) {
      setDealId(r.deal.id)
      alert('Deal created from thread')
    }
  }
  return (
    <div className="p-3 border rounded bg-card space-y-2">
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

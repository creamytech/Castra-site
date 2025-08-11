"use client"
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/http'

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function SmartInboxPanel() {
  const { data, isLoading } = useSWR('/api/inbox/threads?limit=15', fetcher, { refreshInterval: 30000 })
  const threads = (data?.threads || []).slice(0, 15)
  const [selectedId, setSelectedId] = useState<string>('')
  const { data: tDetail } = useSWR(selectedId ? `/api/inbox/threads/${selectedId}` : null, fetcher)
  const thread = tDetail?.thread
  const lastMsg = useMemo(() => (thread?.messages || []).slice(-1)[0], [thread])
  const fromEmail = useMemo(() => {
    const raw = lastMsg?.from || ''
    // parse "Name <email>"
    const m = raw.match(/<?([^<>\s@]+@[^<>\s]+)>?/) // naive but ok
    return m?.[1] || ''
  }, [lastMsg])
  const subject = thread?.subject ? `Re: ${thread.subject}` : 'Quick follow-up'

  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<{ ai?: boolean; send?: boolean; event?: boolean }>({})
  useEffect(() => { setDraft('') }, [selectedId])

  const runAiDraft = async () => {
    if (!lastMsg?.id) return
    setBusy(b => ({ ...b, ai: true }))
    try {
      const res = await apiFetch(`/api/inbox/messages/${lastMsg.id}/ai-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const j = await res.json()
      if (res.ok) setDraft(j.draft || '')
    } finally {
      setBusy(b => ({ ...b, ai: false }))
    }
  }

  const sendReply = async () => {
    if (!lastMsg?.id || !fromEmail || !subject || !draft) return
    setBusy(b => ({ ...b, send: true }))
    try {
      const res = await apiFetch(`/api/inbox/messages/${lastMsg.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', to: fromEmail, subject, draft, dealId: thread?.dealId }) })
      if (res.ok) setDraft('')
    } finally {
      setBusy(b => ({ ...b, send: false }))
    }
  }

  const scheduleTomorrow2pm = async () => {
    setBusy(b => ({ ...b, event: true }))
    try {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() + 1)
      start.setHours(14, 0, 0, 0)
      const end = new Date(start); end.setHours(start.getHours() + 1)
      const payload = {
        summary: `Showing with ${fromEmail || 'lead'}`,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      }
      await apiFetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } finally {
      setBusy(b => ({ ...b, event: false }))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Smart Inbox */}
      <div className="p-4 rounded-xl bg-card border">
        <div className="font-semibold mb-3">Smart Inbox</div>
        {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
        <div className="space-y-2">
          {threads.map((t: any) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className={`w-full text-left p-3 rounded border ${selectedId===t.id ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50'}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">{t.subject || '(No subject)'}</div>
                {t.status && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800">{t.status === 'lead' ? 'Hot Lead' : t.status}</span>}
              </div>
              {!!t.preview && <div className="text-xs text-muted-foreground truncate">{t.preview}</div>}
            </button>
          ))}
          {!isLoading && threads.length===0 && <div className="text-xs text-muted-foreground">No recent threads.</div>}
        </div>
      </div>

      {/* Right: AI Assistant */}
      <div className="p-4 rounded-xl bg-card border">
        <div className="font-semibold mb-3">AI Assistant</div>
        {!selectedId ? (
          <div className="text-sm text-muted-foreground">Select a thread to see suggestions.</div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded bg-primary text-primary-foreground text-sm">
              Schedule a showing with {fromEmail || 'this lead'} for tomorrow at 2pm
            </div>
            <div className="p-3 rounded border bg-background text-sm">
              <div className="font-medium mb-1">Showing scheduled for tomorrow at 2:00 PM</div>
              <div className="text-xs text-muted-foreground">Creates calendar event</div>
              <button onClick={scheduleTomorrow2pm} disabled={busy.event} className="mt-2 px-2 py-1 rounded border text-xs">{busy.event ? 'Creating…' : 'Create event'}</button>
            </div>

            <div className="p-3 rounded border bg-background text-sm">
              <div className="font-medium mb-2">Draft a follow-up email</div>
              <div className="flex gap-2">
                <button onClick={runAiDraft} disabled={busy.ai} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">{busy.ai ? 'Drafting…' : 'AI Draft'}</button>
              </div>
              {draft && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Email draft created</div>
                  <textarea className="w-full border rounded bg-background p-2 text-sm" rows={6} value={draft} onChange={(e)=>setDraft(e.target.value)} />
                  <div className="mt-2 flex gap-2">
                    <button onClick={sendReply} disabled={busy.send} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">{busy.send ? 'Sending…' : 'Send email'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



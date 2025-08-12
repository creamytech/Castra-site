"use client"

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import DOMPurify from 'dompurify'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json())

interface DealThreadPanelProps {
  dealId: string
  threadId: string
}

export default function DealThreadPanel({ dealId, threadId }: DealThreadPanelProps) {
  const { data, mutate, isLoading } = useSWR(threadId ? `/api/inbox/threads/${threadId}` : null, fetcher)
  const thread = data?.thread
  const last = useMemo(() => (thread?.messages || [])[thread?.messages?.length - 1], [thread])

  const [to, setTo] = useState<string>("")
  const [subject, setSubject] = useState<string>("")
  const [body, setBody] = useState<string>("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (thread) {
      const subj = thread.subject ? `Re: ${thread.subject}` : 'Re:'
      setSubject((s) => (s ? s : subj))
      // Default reply target: last sender email
      const from = String(last?.from || '')
      const emailMatch = from.match(/<([^>]+)>/)
      const fallback = emailMatch ? emailMatch[1] : from
      setTo((t) => (t ? t : fallback))
    }
  }, [thread, last])

  const aiDraft = async () => {
    try {
      if (!last?.id) return
      const res = await fetch(`/api/inbox/messages/${last.id}/ai-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tone: 'friendly' }) })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        if (!subject && j.subject) setSubject(j.subject)
        if (j.draft || j.bodyText) setBody(j.draft || j.bodyText)
      }
    } catch {}
  }

  const send = async () => {
    try {
      if (!last?.id || !to || !subject || !body) return
      setSending(true)
      const res = await fetch(`/api/inbox/messages/${last.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', draft: body, to, subject, dealId, threadId }) })
      if (res.ok) {
        setBody('')
        // toast via window event
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Email sent' } }))
        mutate()
      }
    } catch {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Send failed' } }))
    } finally {
      setSending(false)
    }
  }

  if (!threadId) return null
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="p-3 border rounded bg-card">
        <div className="font-semibold truncate">{thread?.subject || '(No subject)'}</div>
        <div className="text-xs text-muted-foreground">{thread?.messages?.length || 0} messages</div>
      </div>
      {/* Messages */}
      <div className="space-y-2">
        {isLoading && <div className="space-y-2"><div className="h-6 rounded skeleton"/><div className="h-24 rounded skeleton"/></div>}
        {(thread?.messages || []).map((m: any) => (
          <div key={m.id} className="p-2 border rounded bg-background overflow-auto">
            <div className="text-xs text-muted-foreground truncate">{m.from} • {new Date(m.date || m.internalDate).toLocaleString()}</div>
            {m.bodyHtml ? (
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.bodyHtml) }} />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{m.bodyText || m.snippet || ''}</div>
            )}
          </div>
        ))}
        {(thread?.messages || []).length === 0 && !isLoading && (
          <div className="text-xs text-muted-foreground">No messages</div>
        )}
      </div>
      {/* Composer */}
      <div className="p-3 border rounded bg-card space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1 bg-background" placeholder="To" value={to} onChange={e=>setTo(e.target.value)} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
        </div>
        <textarea className="w-full border rounded px-2 py-2 bg-background min-h-[120px]" placeholder="Write your reply…" value={body} onChange={e=>setBody(e.target.value)} />
        <div className="flex items-center gap-2 justify-end">
          <button onClick={aiDraft} className="text-xs px-2 py-1 rounded border">AI Suggest</button>
          <button onClick={send} disabled={sending || !to || !subject || !body} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  )
}



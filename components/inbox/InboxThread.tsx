"use client"

import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json())

export default function InboxThread({ threadId }: { threadId: string }) {
  const { data, mutate } = useSWR(threadId ? `/api/inbox/threads/${threadId}` : null, fetcher)
  const thread = data?.thread
  const [draft, setDraft] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')

  const aiDraft = async () => {
    const lastId = thread?.messages?.slice(-1)?.[0]?.id
    if (!lastId) return
    const res = await fetch(`/api/inbox/messages/${lastId}/ai-draft`, { method: 'POST' })
    const j = await res.json()
    if (res.ok) setDraft(j.draft || '')
  }

  const sendEmail = async () => {
    const lastId = thread?.messages?.slice(-1)?.[0]?.id
    if (!lastId) return
    await fetch(`/api/inbox/messages/${lastId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', draft, to, subject, dealId: thread?.dealId }) })
    mutate()
  }

  if (!thread) return <div className="text-sm text-muted-foreground">No thread selected</div>

  return (
    <div className="space-y-3">
      <div className="p-3 border rounded bg-card">
        <div className="font-semibold">{thread.subject || '(No subject)'}</div>
      </div>
      <div className="space-y-2">
        {(thread.messages || []).map((m: any) => (
          <div key={m.id} className="p-2 border rounded bg-background">
            <div className="text-xs text-muted-foreground">{m.from} • {new Date(m.date || m.internalDate).toLocaleString()}</div>
            <div className="text-sm whitespace-pre-wrap">{m.snippet || m.bodyText || ''}</div>
          </div>
        ))}
      </div>
      <div className="p-3 border rounded bg-card space-y-2">
        <div className="text-sm font-semibold">Quick Reply</div>
        <div className="grid grid-cols-3 gap-2">
          <input value={to} onChange={e=>setTo(e.target.value)} placeholder="To" className="border rounded px-2 py-1 bg-background" />
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="border rounded px-2 py-1 bg-background col-span-2" />
        </div>
        <textarea value={draft} onChange={e=>setDraft(e.target.value)} className="w-full h-28 border rounded px-2 py-1 bg-background" placeholder="Write a reply…" />
        <div className="flex gap-2">
          <button onClick={aiDraft} className="px-3 py-1 rounded border text-xs">AI Draft</button>
          <button onClick={sendEmail} disabled={!to || !subject || !draft} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">Send Email</button>
        </div>
      </div>
    </div>
  )
}

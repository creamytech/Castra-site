"use client"

import useSWR from 'swr'
import { useState } from 'react'
import { apiFetch } from '@/lib/http'
import DOMPurify from 'dompurify'
import { ThreadHeader } from '@/components/inbox/ThreadHeader'
import { ThreadSummaryChips } from '@/components/inbox/ThreadSummaryChips'
import { AiDraftBox } from '@/components/inbox/AiDraftBox'
import { ScheduleBox } from '@/components/inbox/ScheduleBox'

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function InboxThread({ threadId }: { threadId: string }) {
  const { data, mutate, isLoading } = useSWR(threadId ? `/api/inbox/threads/${threadId}` : null, fetcher)
  const thread = data?.thread
  const { data: bundle } = useSWR(threadId ? `/api/thread/by-thread/${threadId}/bundle` : null, fetcher)
  const [draft, setDraft] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')

  const aiDraft = async () => {
    const lastId = thread?.messages?.slice(-1)?.[0]?.id
    if (!lastId) return
    const res = await apiFetch(`/api/inbox/messages/${lastId}/ai-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tone: 'friendly' }) })
    const j = await res.json()
    if (res.ok) {
      if (j.subject && !subject) setSubject(j.subject)
      setDraft(j.draft || '')
    }
  }

  const sendEmail = async () => {
    const lastId = thread?.messages?.slice(-1)?.[0]?.id
    if (!lastId) return
    const res = await apiFetch(`/api/inbox/messages/${lastId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', draft, to, subject, threadId: thread?.id, dealId: thread?.dealId }) })
    if (res.ok) setDraft('')
    mutate()
  }

  const replyAll = async () => {
    const last = thread?.messages?.slice(-1)?.[0]
    if (!last) return
    const toAll = [to, ...(last?.cc || [])].filter(Boolean).join(', ')
    const res = await apiFetch(`/api/inbox/messages/${last.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', draft, to: toAll, subject, threadId: thread?.id }) })
    if (res.ok) setDraft('')
    mutate()
  }

  const markReadUnread = async (unread: boolean) => {
    // optimistic UI only; label change would be via Gmail modify API in a follow-up
    await mutate()
  }

  const deleteThread = async () => {
    // UI only for now; server delete can be added via Gmail trash
    // eslint-disable-next-line no-alert
    if (confirm('Move this conversation to trash?')) {
      // optimistic: clear draft
      setDraft('')
    }
  }

  if (!threadId) return <div className="text-sm text-muted-foreground">Select a thread from the left to view</div>
  if (isLoading) return <div className="space-y-2"><div className="h-6 rounded skeleton"/><div className="h-24 rounded skeleton"/></div>
  if (!thread) return <div className="text-sm text-muted-foreground">Thread not found</div>

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur">
        <ThreadHeader lead={{ status: thread.status, score: thread.score ?? 0, reasons: thread.reasons || [] }} onStatusChange={async (s)=>{
          await apiFetch(`/api/leads/${thread.dealId || ''}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) }).catch(()=>{})
        }}/>
        <div className="px-3 py-2 border-b">
          <div className="font-semibold">{thread.subject || '(No subject)'}</div>
          <ThreadSummaryChips lead={{ extracted: thread.extracted }} />
        </div>
      </div>
      <div className="space-y-2">
        {(thread.messages || []).map((m: any) => (
          <div key={m.id} className="p-2 border rounded bg-background overflow-auto">
            <div className="text-xs text-muted-foreground">{m.from} • {new Date(m.date || m.internalDate).toLocaleString()}</div>
            {m.bodyHtml ? (
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.bodyHtml) }} />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{m.bodyText || m.snippet || ''}</div>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border rounded bg-card space-y-2 sticky bottom-0 z-20 bg-card/95 backdrop-blur">
        <AiDraftBox draft={bundle?.draft || { subject, bodyText: draft }} onInsert={()=>{ if (bundle?.draft?.bodyText) setDraft(bundle.draft.bodyText) }} onEdit={()=>{ /* focus */ }} onRegenerate={aiDraft} />
        <div>
          <div className="text-sm font-semibold mb-1">Schedule</div>
          <ScheduleBox schedule={bundle?.schedule} onGenerate={async()=>{
            if (!bundle?.lead?.id) return
            await apiFetch('/api/schedule/propose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: bundle.lead.id }) })
          }} onBook={async (start,end)=>{
            if (!bundle?.lead?.id) return
            await apiFetch('/api/schedule/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: bundle.lead.id, start, end }) })
          }} />
        </div>
        <div className="text-sm font-semibold flex items-center gap-2">
          Quick Reply
          <div className="ml-auto flex items-center gap-2 text-xs">
            <button onClick={()=>markReadUnread(false)} className="px-2 py-1 border rounded">Mark read</button>
            <button onClick={()=>markReadUnread(true)} className="px-2 py-1 border rounded">Mark unread</button>
            <button onClick={deleteThread} className="px-2 py-1 border rounded">Delete</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input value={to} onChange={e=>setTo(e.target.value)} placeholder="To" className="border rounded px-2 py-1 bg-background" />
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="border rounded px-2 py-1 bg-background col-span-2" />
        </div>
        <textarea value={draft} onChange={e=>setDraft(e.target.value)} className="w-full h-28 border rounded px-2 py-1 bg-background" placeholder="Write a reply…" />
        <div className="flex gap-2">
          <button onClick={aiDraft} className="px-3 py-1 rounded border text-xs">AI Draft</button>
          <button onClick={sendEmail} disabled={!to || !subject || !draft} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">Send Email</button>
          <button onClick={replyAll} disabled={!to || !subject || !draft} className="px-3 py-1 rounded border text-xs">Reply All</button>
          <button onClick={() => { navigator.clipboard.writeText(`${subject}\n\n${draft}`)}} className="px-3 py-1 rounded border text-xs">Copy</button>
        </div>
      </div>
    </div>
  )
}

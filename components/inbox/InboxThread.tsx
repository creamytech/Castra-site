"use client"

import useSWR from 'swr'
import { useState } from 'react'
import { apiFetch } from '@/lib/http'
import DOMPurify from 'dompurify'
import { ThreadHeader } from '@/components/inbox/ThreadHeader'
import { ThreadSummaryChips } from '@/components/inbox/ThreadSummaryChips'
import { AiDraftBox } from '@/components/inbox/AiDraftBox'
// Removed separate ScheduleBox; integrated into AiDraftBox
import { useBookSlot } from '@/src/actions/scheduleActions'

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function InboxThread({ threadId }: { threadId: string }) {
  const { data, mutate, isLoading } = useSWR(threadId ? `/api/inbox/threads/${threadId}` : null, fetcher)
  const thread = data?.thread
  const { data: bundle } = useSWR(threadId ? `/api/thread/by-thread/${threadId}/bundle` : null, fetcher)
  const [draft, setDraft] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [picked, setPicked] = useState<{start:string,end:string}|null>(null)

  const aiDraft = async () => {
    const lastId = thread?.messages?.slice(-1)?.[0]?.id
    if (!lastId) return
    const res = await apiFetch(`/api/inbox/messages/${lastId}/ai-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tone: 'friendly' }) })
    const j = await res.json()
    if (res.ok) {
      if (j.subject && !subject) setSubject(j.subject)
      setDraft(j.draft || j.bodyText || '')
    }
  }

  const sendEmail = async () => {
    if (!bundle?.lead?.id) return
    const res = await apiFetch(`/api/messaging/email/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: bundle.lead.id, subject, body: draft }) })
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

  const leadId = bundle?.lead?.id as string | undefined
  const { book } = useBookSlot(leadId || '')
  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur">
        <ThreadHeader lead={{ status: bundle?.lead?.status || thread.status, score: bundle?.lead?.score ?? thread.score ?? 0, reasons: bundle?.lead?.reasons || thread.reasons || [] }} onStatusChange={async (s)=>{
          await apiFetch(`/api/leads/${thread.dealId || ''}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) }).catch(()=>{})
        }}/>
        <div className="px-3 py-2 border-b">
          <div className="font-semibold">{thread.subject || '(No subject)'}</div>
          <ThreadSummaryChips lead={{ extracted: bundle?.lead?.extracted || thread.extracted }} />
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
        <AiDraftBox 
          draft={bundle?.draft}
          subject={subject}
          body={draft}
          setSubject={setSubject}
          setBody={setDraft}
          onInsert={()=>{ if (bundle?.draft?.bodyText) setDraft(bundle.draft.bodyText) }}
          onRegenerate={aiDraft}
          onSend={sendEmail}
          onPickTime={(start,end)=> setPicked({start,end})}
          onSendInvite={(start,end)=>{ if (leadId) book(start,end) }}
          proposed={bundle?.schedule?.proposedWindows || []}
        />
      </div>
    </div>
  )
}

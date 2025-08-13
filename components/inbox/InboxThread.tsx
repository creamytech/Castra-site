"use client"

import useSWR from 'swr'
import { useEffect, useState } from 'react'
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

  // Listen for external prefill events from the Inbox Agent
  // Event detail: { threadId, subject, draft }
  // Only applies if threadId matches the currently open thread
  // Then sets subject and draft and brings composer into view
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {}
      if (!detail?.threadId || detail.threadId !== threadId) return
      if (detail?.subject) setSubject(detail.subject)
      if (detail?.draft) setDraft(detail.draft)
      // Attempt to focus composer textarea
      const el = document.querySelector('#inbox-composer-body') as HTMLTextAreaElement | null
      if (el) el.focus()
    }
    if (typeof window !== 'undefined') window.addEventListener('inbox:prefill-draft', handler as any)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('inbox:prefill-draft', handler as any) }
  }, [threadId])

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

  const queueToDailyBrief = async () => {
    try {
      if (!thread?.id) return
      const res = await apiFetch(`/api/drafts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId: thread.id, leadId: bundle?.lead?.id, subject, bodyText: draft }) })
      if ((res as any).ok) {
        setDraft('')
      }
    } catch {}
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
        <ThreadHeader lead={{ status: bundle?.lead?.status || thread.status, score: bundle?.lead?.score ?? thread.score ?? 0, reasons: bundle?.lead?.reasons || thread.reasons || [] }} threadId={thread.id} dealId={bundle?.deal?.id || bundle?.lead?.id} onStatusChange={async (s)=>{
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
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-muted grid place-items-center text-[10px]">{String(m.from||'?').slice(0,1).toUpperCase()}</div>
              <div className="text-xs text-muted-foreground flex-1 truncate">{m.from} • {formatMessageDate(m)}</div>
            </div>
            {m.bodyHtml ? (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none">Show content</summary>
                <div className="prose prose-invert max-w-none mt-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.bodyHtml) }} />
              </details>
            ) : (
              <div className="text-sm whitespace-pre-wrap">{m.bodyText || m.snippet || ''}</div>
            )}
            {Array.isArray(m.attachments) && m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {m.attachments.map((a:any)=> (
                  <a key={a.id} href={a.downloadUrl || '#'} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs border rounded bg-muted hover:bg-muted/80" download>{a.filename || 'attachment'}</a>
                ))}
              </div>
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
          onQueue={queueToDailyBrief}
          onPickTime={(start,end)=> setPicked({start,end})}
          onSendInvite={(start,end)=>{ if (leadId) book(start,end) }}
          proposed={bundle?.schedule?.proposedWindows || []}
        />
      </div>
    </div>
  )
}

function formatMessageDate(m: any) {
  const d = m?.date ? new Date(m.date) : (m?.internalDate ? new Date(m.internalDate) : null)
  if (!d || isNaN(d.getTime())) return 'Unknown date'
  return d.toLocaleString()
}

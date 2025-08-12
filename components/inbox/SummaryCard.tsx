'use client'

import React, { useState } from 'react'
import { apiFetch } from '@/lib/http'

type SummaryData = {
  tldr?: string
  keyPoints?: string[]
  actionItems?: string[]
  dates?: string[]
  people?: Array<{ name?: string; email?: string }>
  attachments?: Array<{ name: string; url?: string }>
  links?: Array<{ label: string; url: string }>
  sentiment?: 'positive' | 'neutral' | 'negative'
  confidence?: 'low' | 'medium' | 'high'
}

function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default'|'info'|'success'|'warning'|'danger' }) {
  const toneClass = tone === 'info' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    : tone === 'success' ? 'bg-green-500/15 text-green-300 border-green-500/30'
    : tone === 'warning' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    : tone === 'danger' ? 'bg-red-500/15 text-red-300 border-red-500/30'
    : 'bg-muted/50 text-foreground border-border'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${toneClass}`}>{children}</span>
}

export default function SummaryCard({ data, threadId, dealId }: { data: SummaryData; threadId?: string; dealId?: string }) {
  const [copied, setCopied] = useState(false)

  const fullSummaryText = [
    data.tldr,
    ...(data.keyPoints || []).map(p => `- ${p}`),
    ...(data.actionItems || []).map(a => `- [ ] ${a}`),
  ].filter(Boolean).join('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullSummaryText)
      setCopied(true)
      setTimeout(()=>setCopied(false), 1500)
    } catch {}
  }

  const handleInsertIntoReply = () => {
    if (!threadId) return
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inbox:prefill-draft', { detail: { threadId, draft: fullSummaryText } }))
    }
  }

  const handleSaveToDealNotes = async () => {
    if (!dealId) return
    try {
      await apiFetch(`/api/deals/${dealId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: fullSummaryText, kind: 'AI_SUMMARY', subject: 'AI Summary' }) })
    } catch {}
  }
  return (
    <div className="p-3 rounded-lg border bg-card/80 space-y-3">
      {data.tldr && (
        <div className="text-sm">
          <div className="text-foreground font-semibold text-[13px] mb-1">TL;DR</div>
          <div className="text-[13px] leading-5">{data.tldr}</div>
        </div>
      )}

      {Array.isArray(data.keyPoints) && data.keyPoints.length > 0 && (
        <details>
          <summary className="text-xs text-muted-foreground mb-1 cursor-pointer select-none">Key points</summary>
          <ul className="list-disc pl-5 space-y-1 text-[13px]">
            {data.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </details>
      )}

      {Array.isArray(data.actionItems) && data.actionItems.length > 0 && (
        <details>
          <summary className="text-xs text-muted-foreground mb-1 cursor-pointer select-none">Action items</summary>
          <ul className="list-disc pl-5 space-y-1 text-[13px]">
            {data.actionItems.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap gap-1">
        {Array.isArray(data.dates) && data.dates.map((d, i) => <Chip key={`d-${i}`} tone="info">📅 {d}</Chip>)}
        {Array.isArray(data.people) && data.people.map((p, i) => <Chip key={`p-${i}`} tone="default">👤 {p.name || p.email}</Chip>)}
      </div>

      {(data.attachments && data.attachments.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.attachments.map((a, i) => (
            <a key={i} href={a.url || '#'} className="px-2 py-1 rounded border text-xs bg-muted/50 hover:bg-muted/70">📎 {a.name}</a>
          ))}
        </div>
      )}

      {(data.links && data.links.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.links.map((l, i) => (
            <a key={i} href={l.url} className="px-2 py-1 rounded border text-xs underline">🔗 {l.label}</a>
          ))}
        </div>
      )}

      {(data.sentiment || data.confidence) && (
        <div className="flex items-center gap-2 text-[11px]">
          {data.sentiment && <Chip tone={data.sentiment === 'positive' ? 'success' : data.sentiment === 'negative' ? 'danger' : 'default'}>Sentiment: {data.sentiment}</Chip>}
          {data.confidence && <Chip>Confidence: {data.confidence}</Chip>}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleCopy} className="text-xs px-2 py-1 rounded border hover:bg-muted">{copied ? 'Copied' : 'Copy summary'}</button>
        <button onClick={handleInsertIntoReply} className="text-xs px-2 py-1 rounded border hover:bg-muted" disabled={!threadId}>Insert into reply</button>
        <button onClick={handleSaveToDealNotes} className="text-xs px-2 py-1 rounded border hover:bg-muted" disabled={!dealId}>Save to deal notes</button>
      </div>
    </div>
  )
}



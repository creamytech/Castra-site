"use client"
import { STATUS_LABEL, STATUS_COLORS } from "@/src/lib/status";
import useSWR from 'swr'
import { apiFetch } from '@/lib/http'
import SummaryCard from './SummaryCard'
import { useMemo } from 'react'

export function ThreadHeader({ lead, onStatusChange, threadId, dealId }: { lead: any; onStatusChange: (s:string)=>void; threadId?: string; dealId?: string }) {
  const scoreClass = lead.score >= 80 ? 'good' : lead.score >= 60 ? 'warn' : 'dim'
  // animate score sweep via inline style var --sweep
  const sweep = Math.max(0, Math.min(100, (lead.score ?? 0)))
  const effectiveThreadId = threadId || lead?.threadId
  const { data } = useSWR(effectiveThreadId ? `/api/email/summarize?tid=${effectiveThreadId}` : null, async () => {
    const r = await apiFetch('/api/email/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId: effectiveThreadId }) })
    return r.json()
  })
  const summaryData = useMemo(()=>{
    const s = data?.summary
    if (!s) return { tldr: '', keyPoints: [] }
    if (typeof s === 'string') {
      const lines = s.split(/\n+/).map((x:string)=>x.trim()).filter(Boolean)
      return { tldr: lines[0] || '', keyPoints: lines.slice(1,5) }
    }
    return {
      tldr: s.tldr || '',
      keyPoints: s.keyPoints || [],
      actionItems: s.actionItems || [],
      dates: s.dates || [],
      people: s.people || [],
      sentiment: s.sentiment || 'neutral',
      confidence: s.confidence || 'medium'
    }
  }, [data?.summary])

  return (
    <div className="thread-header space-y-3 p-4 border-b bg-gradient-to-b from-card/90 to-card/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
      <div className="flex items-center gap-3 hover-shimmer">
        <span className="status-badge text-white px-3 py-1 rounded-full transition-transform duration-150 hover:scale-[1.03] shadow-sm" style={{ background: STATUS_COLORS[lead.status] }}>
          {STATUS_LABEL[lead.status] || lead.status}
        </span>
        <span className={`border rounded-full w-7 h-7 grid place-items-center text-xs score-${scoreClass} bg-background/60 shadow-inner`} aria-label={`Score ${lead.score ?? 0}`} style={{ ['--sweep' as any]: `${sweep}%` }}>{lead.score ?? 0}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={()=>onStatusChange("lead")} className="px-2 py-1 text-xs rounded-md border bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition" title="Mark Lead">Lead</button>
          <button onClick={()=>onStatusChange("potential")} className="px-2 py-1 text-xs rounded-md border bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition" title="Mark Potential">Potential</button>
          <button onClick={()=>onStatusChange("no_lead")} className="px-2 py-1 text-xs rounded-md border bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition" title="Mark Not Lead">No Lead</button>
        </div>
      </div>
      <div className="reason-chips flex gap-2 flex-wrap">
        {(lead.reasons || []).map((r: string, i: number) => <span key={i} className="chip text-xs px-2 py-1 rounded border bg-background/60 hover:bg-accent/40 transition shadow-sm">{r}</span>)}
      </div>
      {data?.summary && (
      <SummaryCard data={summaryData} threadId={effectiveThreadId} dealId={dealId} />
      )}
    </div>
  );
}



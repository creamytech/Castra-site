"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, MessageSquare, Calendar, ArrowRight, Sparkles, Trash2 } from 'lucide-react'

interface DealCardProps {
  deal: any
  onMove?: (dealId: string, nextStage: string) => Promise<void> | void
  onEmail?: (deal: any) => void
  onSMS?: (deal: any) => void
  onSchedule?: (deal: any) => void
  onOpen?: (dealId: string) => void
}

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export default function DealCard({ deal, onMove, onEmail, onSMS, onSchedule, onOpen }: DealCardProps) {
  const router = useRouter()
  const nextStage = ORDER[Math.min(ORDER.indexOf(deal.stage) + 1, ORDER.length - 1)]
  const promptClose = async (toStage: string) => {
    if (toStage === 'CLOSED' || toStage === 'LOST') {
      const reason = window.prompt('Enter close reason:') || ''
      if (!reason) return null
      let value: number | undefined = undefined
      if (toStage === 'CLOSED') {
        const v = window.prompt('Enter deal value (e.g., 750000):') || ''
        if (!v) return null
        value = Number(v)
        if (Number.isNaN(value)) return null
      }
      return { closeReason: reason, value }
    }
    return {}
  }
  const leadStatus = (deal as any)?.emailThreads?.[0]?.status || ''
  const leadScore = (deal as any)?.emailThreads?.[0]?.score as number | undefined
  const isLead = leadStatus === 'lead' || (leadScore != null && leadScore >= 70)
  const initials = (deal?.contacts?.[0]?.contact?.firstName || deal?.title || '?').slice(0,1)
  const scoreColor = isLead ? 'from-emerald-400 to-emerald-700' : 'from-muted to-muted'

  return (
    <div
      tabIndex={0}
      role="listitem"
      data-deal-id={deal.id}
      data-stage={deal.stage}
      data-updated-at={deal.updatedAt}
      className="p-3 rounded-lg bg-card shadow-sm hover:shadow transition-shadow cursor-pointer touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary border border-border/50"
      onClick={() => onOpen ? onOpen(deal.id) : router.push(`/crm/deals/${deal.id}`)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="relative font-semibold truncate pr-5">
              {deal.title}
              {typeof leadScore === 'number' && (
                <span className="absolute -right-0.5 -top-0.5 inline-block align-middle">
                  <span className={`inline-block w-[14px] h-[14px] rounded-full bg-[conic-gradient(theme(colors.emerald.400)_${'{'}${'Math.max(0, Math.min(100, leadScore))'}{'}'}%,theme(colors.muted.DEFAULT)_0)]`} aria-label={`Score ${leadScore}`}></span>
                </span>
              )}
            </div>
            {isLead && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">Lead</span>}
            <div className="ml-auto text-xs text-foreground/80">{deal.value ? `$${Number(deal.value).toLocaleString()}` : (deal.priceTarget ? `$${Number(deal.priceTarget).toLocaleString()}` : '')}</div>
          </div>
          <div className="text-xs text-muted-foreground truncate">{deal.propertyAddr || deal.city || ''}</div>
        </div>
        <div className="w-6 h-6 rounded-full bg-muted text-[10px] grid place-items-center" aria-hidden>{initials}</div>
      </div>
      {deal.nextAction && (
        <div className="text-[11px] mt-1 text-foreground/90">Next: {deal.nextAction}{deal.nextDue ? ` by ${new Date(deal.nextDue).toLocaleDateString()}` : ''}</div>
      )}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button onClick={(e)=>{ e.stopPropagation(); if ((deal as any)?.emailThreads?.[0]?.id) { window.location.href = `/dashboard/inbox/${(deal as any).emailThreads[0].id}` } else { onEmail?.(deal) } }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Email</button>
        <button onClick={(e)=>{ e.stopPropagation(); onSMS?.(deal) }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> SMS</button>
        <button onClick={(e)=>{ e.stopPropagation(); onSchedule?.(deal) }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Schedule</button>
        <button onClick={async () => { try { const r = await fetch(`/api/deals/${deal.id}/quick-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'AI_SUGGEST_NEXT' }) }); const j = await r.json(); if (r.ok) alert(`Suggestion: ${j.suggestion}`) } catch {} }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</button>
        <div className="ml-auto" />
        <button disabled={deal.stage === 'CLOSED' || deal.stage === 'LOST'} onClick={async (e)=>{ e.stopPropagation(); const extra = await promptClose(nextStage); if (extra === null) return; await fetch(`/api/deals/${deal.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: nextStage, ...extra }) }); if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('deals:refresh')); window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: `Moved to ${nextStage}` } })) } }} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {nextStage}</button>
        <button onClick={async (e)=>{ e.stopPropagation(); if (!confirm('Archive deal?')) return; const r = await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' }); if (r.ok && typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('deals:refresh')); const undo = await r.json().catch(()=>({})); const undoToken = undo?.undoToken || deal.id; const tId = setTimeout(()=>{}, 10000); (window as any).lastUndo = { id: undoToken, timeout: tId }; window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Deal archived — Undo available for 10s' } })) } }} className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
      </div>
    </div>
  )
}

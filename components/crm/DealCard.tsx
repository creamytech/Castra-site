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
  return (
    <div className="p-3 rounded-lg border border-border bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 transition-colors cursor-pointer touch-manipulation select-none" onClick={() => onOpen ? onOpen(deal.id) : router.push(`/crm/deals/${deal.id}`)}>
      <div className="font-medium truncate">{deal.title}</div>
      <div className="text-xs text-muted-foreground truncate">{deal.city || ''} {deal.priceTarget ? `• $${deal.priceTarget.toLocaleString()}` : ''}</div>
      {deal.nextAction && (
        <div className="text-xs mt-1">Next: {deal.nextAction}{deal.nextDue ? ` by ${new Date(deal.nextDue).toLocaleDateString()}` : ''}</div>
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

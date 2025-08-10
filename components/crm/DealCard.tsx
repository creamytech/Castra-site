"use client"

import { useState } from 'react'
import { Mail, MessageSquare, Calendar, ArrowRight, Sparkles } from 'lucide-react'

interface DealCardProps {
  deal: any
  onMove?: (dealId: string, nextStage: string) => Promise<void> | void
  onEmail?: (deal: any) => void
  onSMS?: (deal: any) => void
  onSchedule?: (deal: any) => void
}

const ORDER = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export default function DealCard({ deal, onMove, onEmail, onSMS, onSchedule }: DealCardProps) {
  const nextStage = ORDER[Math.min(ORDER.indexOf(deal.stage) + 1, ORDER.length - 1)]
  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
      <div className="font-medium truncate">{deal.title}</div>
      <div className="text-xs text-muted-foreground truncate">{deal.city || ''} {deal.priceTarget ? `• $${deal.priceTarget.toLocaleString()}` : ''}</div>
      {deal.nextAction && (
        <div className="text-xs mt-1">Next: {deal.nextAction}{deal.nextDue ? ` by ${new Date(deal.nextDue).toLocaleDateString()}` : ''}</div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => onEmail?.(deal)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Email</button>
        <button onClick={() => onSMS?.(deal)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> SMS</button>
        <button onClick={() => onSchedule?.(deal)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Schedule</button>
        <button onClick={async () => { try { const r = await fetch(`/api/deals/${deal.id}/quick-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'AI_SUGGEST_NEXT' }) }); const j = await r.json(); if (r.ok) alert(`Suggestion: ${j.suggestion}`) } catch {} }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</button>
        <div className="ml-auto" />
        <button disabled={deal.stage === 'CLOSED' || deal.stage === 'LOST'} onClick={() => onMove?.(deal.id, nextStage)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {nextStage}</button>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from 'react'
import DealCard from './DealCard'
import DraggableCard from './DraggableCard'
import { useDroppable } from '@dnd-kit/core'
import EmptyStage from './EmptyStage'

export default function StageColumn({ stage, filters, onMove, refreshKey, onEmail, onSMS, onSchedule, icon, onOpen }: { stage: string; filters: any; onMove: (dealId: string, toStage: string) => void; refreshKey?: number; onEmail?: (deal: any)=>void; onSMS?: (deal:any)=>void; onSchedule?: (deal:any)=>void; icon?: string; onOpen?: (dealId: string)=>void }) {
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const { isOver, setNodeRef } = useDroppable({ id: stage })
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const load = async (reset = false) => {
    setLoading(true)
    const params = new URLSearchParams({ stage, page: String(reset ? 1 : page), pageSize: '25', ...(filters?.q ? { q: filters.q } : {}), ...(filters?.city ? { city: filters.city } : {}), ...(filters?.priceMin ? { minPrice: String(filters.priceMin) } : {}), ...(filters?.priceMax ? { maxPrice: String(filters.priceMax) } : {}), ...(filters?.type ? { type: filters.type } : {}), ...(filters?.hot ? { hot: 'true' } : {}) })
    const res = await fetch(`/api/deals?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) {
      setTotal(data.total || 0)
      // Ensure stable sort by position client-side as a safety net
      const rows = (data.deals || []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      setItems(reset ? rows : [...items, ...rows])
    }
    setLoading(false)
  }

  useEffect(() => { setPage(1); load(true) }, [stage, JSON.stringify(filters), refreshKey])
  useEffect(() => { if (page > 1) load(false) }, [page])

  const reorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return
    const next = items.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    // Optimistic reorder locally
    setItems(next)
    try {
      const updates = next.map((d: any, idx: number) => ({ id: d.id, position: idx + 1 }))
      const res = await fetch('/api/deals/reorder', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage, updates }) })
      if (!res.ok) throw new Error('reorder failed')
    } catch {
      // Rollback by reloading
      load(true)
    }
  }

  return (
    <div ref={setNodeRef} className={`bg-card border border-border rounded-lg p-3 flex flex-col min-h-[200px] ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{icon ? <span className="mr-1" aria-hidden>{icon}</span> : null}<span aria-label={`Stage ${stage}`}>{stage}</span> <span className="text-xs text-muted-foreground">{total}</span></div>
        <button onClick={()=>setShowCreate(true)} className="text-xs px-2 py-1 rounded border">+ New</button>
      </div>
      <div className="space-y-2 flex-1">
        {items.map((d: any) => (
          <DraggableCard key={d.id} id={d.id} data={{ stage, position: d.position }}>
            <DealCard deal={d} onMove={(id, next) => onMove(id, next)} onEmail={onEmail} onSMS={onSMS} onSchedule={onSchedule} onOpen={onOpen} />
          </DraggableCard>
        ))}
        {!loading && items.length === 0 && <EmptyStage stage={stage} />}
      </div>
      {loading && <div className="text-xs text-muted-foreground mt-2">Loading…</div>}
      {!loading && items.length < total && (
        <button onClick={() => setPage(p => p + 1)} className="mt-2 text-xs px-2 py-1 rounded border">Load more</button>
      )}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={()=>setShowCreate(false)}>
          <div className="bg-background border rounded p-4 w-full max-w-md space-y-2" onClick={e=>e.stopPropagation()}>
            <div className="font-semibold">Create Deal in {stage}</div>
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Title" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded px-2 py-1 bg-background" placeholder="Contact name" value={contactName} onChange={e=>setContactName(e.target.value)} />
              <input className="border rounded px-2 py-1 bg-background" placeholder="Contact email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowCreate(false)} className="px-2 py-1 text-xs border rounded">Cancel</button>
              <button onClick={async()=>{
                let contactId: string | undefined
                if (contactEmail || contactName) {
                  const cRes = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: contactName.split(' ')[0]||'', lastName: contactName.split(' ').slice(1).join(' '), email: contactEmail }) })
                  const cJ = await cRes.json()
                  contactId = cJ?.contact?.id
                }
                await fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, stage, type: 'BUYER', contactId }) })
                setShowCreate(false); setNewTitle(''); setContactEmail(''); setContactName('');
                setPage(1); setItems([]); load(true)
              }} disabled={!newTitle} className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

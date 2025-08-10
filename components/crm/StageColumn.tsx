"use client"

import { useEffect, useState } from 'react'
import DealCard from './DealCard'

export default function StageColumn({ stage, filters, onMove }: { stage: string; filters: any; onMove: (dealId: string, toStage: string) => void }) {
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const load = async (reset = false) => {
    setLoading(true)
    const params = new URLSearchParams({ stage, page: String(reset ? 1 : page), pageSize: '25', ...(filters?.q ? { q: filters.q } : {}), ...(filters?.city ? { city: filters.city } : {}), ...(filters?.priceMin ? { minPrice: String(filters.priceMin) } : {}), ...(filters?.priceMax ? { maxPrice: String(filters.priceMax) } : {}) })
    const res = await fetch(`/api/deals?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) {
      setTotal(data.total || 0)
      setItems(reset ? (data.deals || []) : [...items, ...(data.deals || [])])
    }
    setLoading(false)
  }

  useEffect(() => { setPage(1); load(true) }, [stage, JSON.stringify(filters)])
  useEffect(() => { if (page > 1) load(false) }, [page])

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
      <div className="text-sm font-semibold mb-2">{stage} <span className="text-xs text-muted-foreground">{total}</span></div>
      <div className="space-y-2 flex-1">
        {items.map((d: any) => (
          <DealCard key={d.id} deal={d} onMove={(id, next) => onMove(id, next)} onEmail={() => {}} onSMS={() => {}} onSchedule={() => {}} />
        ))}
        {!loading && items.length === 0 && <div className="text-xs text-muted-foreground">No deals in {stage} yet.</div>}
      </div>
      {loading && <div className="text-xs text-muted-foreground mt-2">Loading…</div>}
      {!loading && items.length < total && (
        <button onClick={() => setPage(p => p + 1)} className="mt-2 text-xs px-2 py-1 rounded border">Load more</button>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from 'react'
import StageColumn from './StageColumn'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import NewDealDialog from './NewDealDialog'

const STAGES = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export default function PipelineBoard() {
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<any>({})
  const [refreshKey, setRefreshKey] = useState<number>(0)

  useEffect(() => { setLoading(false) }, [])

  const moveStage = async (dealId: string, nextStage: string) => {
    const res = await fetch(`/api/deals/${dealId}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStage: nextStage }) })
    // optimistic per-column reloads will occur via individual columns
  }

  const onDragEnd = async (e: DragEndEvent) => {
    const activeId = e.active.id as string
    const toStage = (e.over?.id as string) || ''
    if (STAGES.includes(toStage)) {
      await moveStage(activeId, toStage)
    }
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm">
          <input className="border rounded px-2 py-1 bg-background" placeholder="Search" onChange={e => setFilters((f: any) => ({ ...f, q: e.target.value }))} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="City" onChange={e => setFilters((f: any) => ({ ...f, city: e.target.value }))} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="Min $" onChange={e => setFilters((f: any) => ({ ...f, priceMin: e.target.value }))} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="Max $" onChange={e => setFilters((f: any) => ({ ...f, priceMax: e.target.value }))} />
        </div>
        <div>
          <NewDealDialog onCreated={() => { setRefreshKey(Date.now()) }} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4">
        {STAGES.map(stage => (
          <StageColumn key={stage} stage={stage} filters={filters} onMove={moveStage} refreshKey={refreshKey} />
        ))}
      </div>
    </DndContext>
  )
}

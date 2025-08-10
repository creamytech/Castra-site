"use client"

import { useEffect, useState } from 'react'
import StageColumn from './StageColumn'

const STAGES = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export default function PipelineBoard() {
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<any>({})

  useEffect(() => { setLoading(false) }, [])

  const moveStage = async (dealId: string, nextStage: string) => {
    const res = await fetch(`/api/deals/${dealId}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStage: nextStage }) })
    // optimistic per-column reloads will occur via individual columns
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4">
      {STAGES.map(stage => (
        <StageColumn key={stage} stage={stage} filters={filters} onMove={moveStage} />
      ))}
    </div>
  )
}

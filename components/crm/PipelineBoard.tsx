"use client"

import { useEffect, useState } from 'react'
import DealCard from './DealCard'

const STAGES = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export default function PipelineBoard() {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals?pageSize=200', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setDeals(data.deals || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const moveStage = async (dealId: string, nextStage: string) => {
    const res = await fetch(`/api/deals/${dealId}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: nextStage }) })
    if (res.ok) load()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4">
      {STAGES.map(stage => (
        <div key={stage} className="bg-card border border-border rounded-lg p-3">
          <div className="text-sm font-semibold mb-2">{stage}</div>
          <div className="space-y-2 min-h-[200px]">
            {deals.filter(d => d.stage === stage).map(d => (
              <DealCard key={d.id} deal={d} onMove={moveStage} onEmail={() => {}} onSMS={() => {}} onSchedule={() => {}} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

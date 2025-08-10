"use client"

import { useEffect, useState } from 'react'
import Timeline from '@/components/crm/Timeline'
import AutopilotPanel from '@/components/crm/AutopilotPanel'
import DraftsPanel from '@/components/crm/DraftsPanel'
import { useRouter } from 'next/navigation'

export default function DealWorkspace({ params }: { params: { id: string } }) {
  const { id } = params
  const [deal, setDeal] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/deals/${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setDeal(data.deal)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading deal…</div>
  if (!deal) return <div className="p-6 text-sm text-muted-foreground">Deal not found.</div>

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <div className="text-sm text-muted-foreground">{deal.stage} • {deal.city || ''} {deal.priceTarget ? `• $${deal.priceTarget.toLocaleString()}` : ''}</div>
        </div>
        <Timeline dealId={deal.id} />
      </div>
      <div className="lg:col-span-4 space-y-4">
        <AutopilotPanel userId={deal.userId} stage={deal.stage} />
        <DraftsPanel dealId={deal.id} />
      </div>
    </div>
  )
}

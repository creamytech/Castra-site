"use client"

import { useEffect, useState } from 'react'
import Timeline from '@/components/crm/Timeline'
import AutopilotPanel from '@/components/crm/AutopilotPanel'
import DraftsPanel from '@/components/crm/DraftsPanel'
import PreferencesEditor from '@/components/deal/PreferencesEditor'
import EmailComposer from '@/components/messaging/EmailComposer'
import SmsComposer from '@/components/messaging/SmsComposer'
import ConfirmShowingSheet from '@/components/calendar/ConfirmShowingSheet'

export default function DealWorkspace({ params }: { params: { id: string } }) {
  const { id } = params
  const [deal, setDeal] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState({ city: '', priceMin: '', priceMax: '', bedsMin: '', bathsMin: '' })
  const [results, setResults] = useState<any[]>([])
  const [cmaLoading, setCmaLoading] = useState(false)
  const [cmaResult, setCmaResult] = useState<any | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailBody, setEmailBody] = useState('')

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

  const doSearch = async () => {
    const body: any = {}
    if (search.city) body.city = search.city
    if (search.priceMin) body.priceMin = Number(search.priceMin)
    if (search.priceMax) body.priceMax = Number(search.priceMax)
    if (search.bedsMin) body.bedsMin = Number(search.bedsMin)
    if (search.bathsMin) body.bathsMin = Number(search.bathsMin)
    const res = await fetch('/api/mls/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, limit: 6 }) })
    const data = await res.json()
    if (res.ok) setResults(data)
  }

  const generateCMA = async () => {
    setCmaLoading(true)
    const body: any = { address: deal?.propertyAddr, city: deal?.city, beds: deal?.leadPreference?.beds, baths: deal?.leadPreference?.baths }
    const res = await fetch('/api/mls/comps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (res.ok) setCmaResult(data)
    setCmaLoading(false)
  }

  const exportCMA = async () => {
    const body: any = { address: deal?.propertyAddr, city: deal?.city, beds: deal?.leadPreference?.beds, baths: deal?.leadPreference?.baths }
    const res = await fetch('/api/mls/cma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cma.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading deal…</div>
  if (!deal) return <div className="p-6 text-sm text-muted-foreground">Deal not found.</div>

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <div className="text-sm text-muted-foreground">{deal.stage} • {deal.city || ''} {deal.priceTarget ? `• $${deal.priceTarget.toLocaleString()}` : ''}</div>
        </div>

        {deal.type === 'BUYER' && (
          <div className="p-4 border rounded-lg bg-card">
            <div className="font-semibold mb-2">Search Listings</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <input className="border rounded px-2 py-1 bg-background" placeholder="City" value={search.city} onChange={e=>setSearch(s=>({...s, city: e.target.value}))} />
              <input className="border rounded px-2 py-1 bg-background" placeholder="Min $" value={search.priceMin} onChange={e=>setSearch(s=>({...s, priceMin: e.target.value}))} />
              <input className="border rounded px-2 py-1 bg-background" placeholder="Max $" value={search.priceMax} onChange={e=>setSearch(s=>({...s, priceMax: e.target.value}))} />
              <input className="border rounded px-2 py-1 bg-background" placeholder="Beds ≥" value={search.bedsMin} onChange={e=>setSearch(s=>({...s, bedsMin: e.target.value}))} />
              <input className="border rounded px-2 py-1 bg-background" placeholder="Baths ≥" value={search.bathsMin} onChange={e=>setSearch(s=>({...s, bathsMin: e.target.value}))} />
              <button onClick={doSearch} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm">Search</button>
            </div>
            {results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {results.slice(0,6).map((l:any)=> (
                  <div key={l.id} className="border rounded-lg overflow-hidden bg-card">
                    <img src={l.thumbnailUrl} alt="" className="w-full h-36 object-cover" />
                    <div className="p-2 text-sm">
                      <div className="font-semibold">${l.price.toLocaleString()}</div>
                      <div className="text-muted-foreground">{l.address}, {l.city} {l.zipcode}</div>
                      <div>{l.beds} bd • {l.baths} ba • {l.sqft} sqft</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {deal.type === 'SELLER' && (
          <div className="p-4 border rounded-lg bg-card space-y-2">
            <div className="font-semibold">CMA Generator</div>
            <div className="flex gap-2">
              <button onClick={generateCMA} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm" disabled={cmaLoading}>{cmaLoading ? 'Generating…' : 'Generate Comps'}</button>
              {cmaResult && <button onClick={exportCMA} className="px-3 py-2 rounded border text-sm">Export PDF</button>}
            </div>
            {cmaResult && (
              <div className="text-sm">
                <div>Suggested Price: ${cmaResult.subjectEstimate.suggestedPrice.toLocaleString()} (${cmaResult.subjectEstimate.range.low.toLocaleString()} - ${cmaResult.subjectEstimate.range.high.toLocaleString()})</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {cmaResult.comps.map((c:any, i:number)=> (
                    <div key={i} className="border rounded p-2">
                      <div className="font-medium">{c.address}</div>
                      <div className="text-muted-foreground">{c.city}, {c.state} {c.zipcode}</div>
                      <div>{c.beds}bd/{c.baths}ba • {c.sqft} sqft • {c.distanceMiles} mi</div>
                      <div>Adj Price: ${c.price.toLocaleString()} (${c.pricePerSqft}/sqft)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="p-4 border rounded-lg bg-card space-y-3">
          <div className="font-semibold text-sm">Messages</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <EmailComposer dealId={deal.id} />
              <div className="mt-2">
                <button onClick={()=>setShowConfirm(true)} className="px-2 py-1 text-xs border rounded">Propose Showing Times</button>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">SMS</div>
              <SmsComposer dealId={deal.id} />
            </div>
          </div>
        </div>

        <Timeline dealId={deal.id} />
      </div>
      <div className="lg:col-span-4 space-y-4">
        <AutopilotPanel userId={deal.userId} stage={deal.stage} />
        <div className="p-3 border rounded-lg bg-card">
          <div className="font-semibold mb-2 text-sm">Preferences</div>
          <PreferencesEditor dealId={deal.id} />
        </div>
        <DraftsPanel dealId={deal.id} />
      </div>

      <ConfirmShowingSheet open={showConfirm} onClose={()=>setShowConfirm(false)} onInsert={(text)=>setEmailBody(text)} />
    </div>
  )
}

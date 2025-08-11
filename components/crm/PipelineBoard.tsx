"use client"

import { useEffect, useState } from 'react'
import StageColumn from './StageColumn'
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import NewDealDialog from './NewDealDialog'

const STAGES = ['LEAD','QUALIFIED','SHOWING','OFFER','ESCROW','CLOSED','LOST']

export default function PipelineBoard() {
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<any>({})
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [activeDeal, setActiveDeal] = useState<any | null>(null)
  const [showEmail, setShowEmail] = useState(false)
  const [showSMS, setShowSMS] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerData, setDrawerData] = useState<{ emails: any[]; events: any[] }>({ emails: [], events: [] })

  useEffect(() => { setLoading(false) }, [])
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
        tolerance: 8
      }
    })
  )

  const moveStage = async (dealId: string, nextStage: string) => {
    // trigger immediate refresh for optimistic feel
    setRefreshKey(Date.now())
    try {
      const res = await fetch(`/api/deals/${dealId}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStage: nextStage }) })
      if (!res.ok) throw new Error('Move failed')
    } catch (e) {
      // rollback by another refresh; server is source of truth
    } finally {
      setRefreshKey(Date.now())
    }
  }

  const onDragEnd = async (e: DragEndEvent) => {
    const activeId = e.active.id as string
    const toStage = (e.over?.id as string) || ''
    if (STAGES.includes(toStage)) {
      await moveStage(activeId, toStage)
    }
  }

  const openEmail = (deal: any) => { setActiveDeal(deal); setShowEmail(true); setShowSMS(false); setShowSchedule(false) }
  const openSMS = (deal: any) => { setActiveDeal(deal); setShowSMS(true); setShowEmail(false); setShowSchedule(false) }
  const openSchedule = (deal: any) => { setActiveDeal(deal); setShowSchedule(true); setShowEmail(false); setShowSMS(false) }
  const openDrawer = async (dealId: string) => {
    // Fetch recent emails linked to the deal and upcoming events
    try {
      setDrawerOpen(true)
      const [emailsRes, eventsRes] = await Promise.all([
        fetch(`/api/inbox/threads?limit=5&hasDeal=true`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({ threads: [] })),
        fetch(`/api/calendar/upcoming`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({ events: [] })),
      ])
      setDrawerData({ emails: emailsRes.threads || [], events: eventsRes.events || [] })
      setActiveDeal({ id: dealId, title: 'Deal' })
    } catch {}
  }

  return (
    <DndContext onDragEnd={onDragEnd} collisionDetection={closestCenter} sensors={sensors}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <input className="border rounded px-2 py-1 bg-background" placeholder="Search" onChange={e => setFilters((f: any) => ({ ...f, q: e.target.value }))} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="City" onChange={e => setFilters((f: any) => ({ ...f, city: e.target.value }))} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="Min $" onChange={e => setFilters((f: any) => ({ ...f, priceMin: e.target.value }))} />
          <input className="border rounded px-2 py-1 bg-background" placeholder="Max $" onChange={e => setFilters((f: any) => ({ ...f, priceMax: e.target.value }))} />
          <select className="border rounded px-2 py-1 bg-background" onChange={e=>setFilters((f:any)=>({ ...f, type: e.target.value||undefined }))}>
            <option value="">All Types</option>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="RENTAL">Rental</option>
          </select>
          <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" onChange={e=>setFilters((f:any)=>({ ...f, hot: e.target.checked }))} /> Hot leads only</label>
        </div>
        <div>
          <NewDealDialog onCreated={() => { setRefreshKey(Date.now()) }} />
        </div>
      </div>
      {/* TODO: Side drawer for deal details can be added here; using modal pattern for now */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4">
        {STAGES.map(stage => (
          <StageColumn key={stage} stage={stage} filters={filters} onMove={moveStage} refreshKey={refreshKey}
            onEmail={openEmail} onSMS={openSMS} onSchedule={openSchedule}
            icon={{ LEAD:'🧑‍🤝‍🧑', QUALIFIED:'📞', SHOWING:'🏠', OFFER:'🤝', ESCROW:'📑', CLOSED:'🔑', LOST:'❌' }[stage]}
            onOpen={openDrawer}
          />
        ))}
      </div>
      {/* Side Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40" onClick={()=>setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l p-4 overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="font-semibold mb-2">Deal Details</div>
            <div className="text-sm text-muted-foreground mb-4">Recent emails</div>
            <div className="space-y-2 mb-4">
              {drawerData.emails.slice(0,3).map((t:any)=>(
                <a key={t.id} href={`/dashboard/inbox/${t.id}`} className="block p-2 border rounded hover:bg-muted/50">
                  <div className="text-sm truncate">{t.subject || '(No subject)'}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.lastSyncedAt).toLocaleString()}</div>
                </a>
              ))}
              {drawerData.emails.length===0 && <div className="text-xs text-muted-foreground">No recent emails</div>}
            </div>
            <div className="text-sm text-muted-foreground mb-2">Upcoming events</div>
            <div className="space-y-2">
              {drawerData.events.slice(0,3).map((e:any)=>(
                <div key={e.id} className="p-2 border rounded">
                  <div className="text-sm">{e.summary || 'Event'}</div>
                  <div className="text-xs text-muted-foreground">{e.start?.dateTime || e.start?.date}</div>
                </div>
              ))}
              {drawerData.events.length===0 && <div className="text-xs text-muted-foreground">No upcoming events</div>}
            </div>
          </div>
        </div>
      )}
      {showEmail && activeDeal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background border rounded p-4 w-full max-w-lg space-y-2">
            <div className="font-semibold">Email {activeDeal.title}</div>
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Subject" id="email-subj" />
            <textarea className="w-full h-32 border rounded px-2 py-1 bg-background" placeholder="Message" id="email-body" />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowEmail(false)} className="px-2 py-1 border rounded text-xs">Cancel</button>
              <button onClick={async()=>{
                const subj = (document.getElementById('email-subj') as HTMLInputElement)?.value
                const body = (document.getElementById('email-body') as HTMLTextAreaElement)?.value
                await fetch('/api/messaging/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: activeDeal.id, subject: subj, body }) })
                setShowEmail(false)
              }} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">Send</button>
            </div>
          </div>
        </div>
      )}
      {showSMS && activeDeal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background border rounded p-4 w-full max-w-md space-y-2">
            <div className="font-semibold">SMS {activeDeal.title}</div>
            <textarea className="w-full h-24 border rounded px-2 py-1 bg-background" placeholder="Text message" id="sms-body" />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowSMS(false)} className="px-2 py-1 border rounded text-xs">Cancel</button>
              <button onClick={async()=>{
                const body = (document.getElementById('sms-body') as HTMLTextAreaElement)?.value
                await fetch('/api/messaging/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId: activeDeal.id, body }) })
                setShowSMS(false)
              }} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">Send</button>
            </div>
          </div>
        </div>
      )}
      {showSchedule && activeDeal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background border rounded p-4 w-full max-w-md space-y-2">
            <div className="font-semibold">Schedule for {activeDeal.title}</div>
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Start (RFC3339)" id="cal-start" />
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="End (RFC3339)" id="cal-end" />
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Summary" id="cal-summary" />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowSchedule(false)} className="px-2 py-1 border rounded text-xs">Cancel</button>
              <button onClick={async()=>{
                const startISO = (document.getElementById('cal-start') as HTMLInputElement)?.value
                const endISO = (document.getElementById('cal-end') as HTMLInputElement)?.value
                const summary = (document.getElementById('cal-summary') as HTMLInputElement)?.value
                await fetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, startISO, endISO }) })
                setShowSchedule(false)
              }} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">Create</button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  )
}

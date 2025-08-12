"use client"

import { useEffect, useMemo, useState } from 'react'
import StageColumn from './StageColumn'
import { DndContext, DragEndEvent, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverEvent, Over } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import NewDealDialog from './NewDealDialog'
import DealThreadPanel from './DealThreadPanel'

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
  const [drawerThreadId, setDrawerThreadId] = useState<string | null>(null)

  useEffect(() => { setLoading(false) }, [])
  useEffect(() => {
    const onRefresh = () => setRefreshKey(Date.now())
    const onToast = (e: any) => {
      const detail = e?.detail || {}
      const el = document.createElement('div')
      el.className = `fixed top-4 right-4 z-[60] px-3 py-2 rounded text-xs ${detail.type==='success' ? 'bg-green-600 text-white' : detail.type==='info' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`
      el.textContent = detail.message || 'Action complete'
      document.body.appendChild(el)
      setTimeout(()=>{ el.remove() }, 3500)
    }
    const onUndo = async () => {
      const last: any = (window as any).lastUndo
      if (last?.id) {
        await fetch('/api/deals/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: last.id }) })
        setRefreshKey(Date.now())
      }
    }
    if (typeof window !== 'undefined') window.addEventListener('deals:refresh', onRefresh)
    if (typeof window !== 'undefined') window.addEventListener('toast', onToast as any)
    if (typeof window !== 'undefined') (window as any).undoArchived = onUndo
    return () => { if (typeof window !== 'undefined') window.removeEventListener('deals:refresh', onRefresh) }
  }, [])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  // Keyboard shortcuts: Cmd/Ctrl + arrows to change stage; J/K navigate; Enter open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      const focused = document.activeElement as HTMLElement | null
      // Cards are buttons/divs; we mark them with data-deal-id
      if (!focused) return
      const dealId = focused.getAttribute('data-deal-id')
      const stage = focused.getAttribute('data-stage')
      if (!dealId || !stage) return
      if (isMeta && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault()
        const idx = STAGES.indexOf(stage)
        const nextIdx = e.key === 'ArrowRight' ? Math.min(idx + 1, STAGES.length - 1) : Math.max(idx - 1, 0)
        if (nextIdx !== idx) moveStage(dealId, STAGES[nextIdx])
        return
      }
      if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'k') {
        // naive focus move to next/prev card in DOM order
        const root = document.getElementById('pipeline-root')
        if (!root) return
        const cards = Array.from(root.querySelectorAll('[data-deal-id]')) as HTMLElement[]
        const i = cards.findIndex(c => c === focused)
        const next = e.key.toLowerCase() === 'j' ? cards[i + 1] : cards[i - 1]
        if (next) { e.preventDefault(); next.focus() }
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const id = dealId
        openDrawer(id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const moveStage = async (dealId: string, nextStage: string, expectedUpdatedAt?: string) => {
    // trigger immediate refresh for optimistic feel
    setRefreshKey(Date.now())
    try {
      const res = await fetch(`/api/deals/${dealId}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStage: nextStage, expectedUpdatedAt }) })
      if (!res.ok) throw new Error('Move failed')
    } catch (e) {
      // rollback by another refresh; server is source of truth
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Failed to move deal. Board reloaded.' } }))
    } finally {
      setRefreshKey(Date.now())
    }
  }

  const onDragEnd = async (e: DragEndEvent) => {
    const activeId = e.active.id as string
    const activeData = (e.active.data?.current || {}) as any
    const activeStage = activeData?.stage as string | undefined
    const overId = (e.over?.id as string) || ''
    // If dropped over a column, move to that stage
    if (STAGES.includes(overId)) {
      await moveStage(activeId, overId, activeData?.updatedAt)
      return
    }
    // If dropped over another card, pairwise insert; if cross-stage, move then reorder
    const overData = (e.over?.data?.current || {}) as any
    const targetStage = overData?.stage as string | undefined
    if (targetStage) {
      try {
        if (activeStage && targetStage && activeStage !== targetStage) {
          await moveStage(activeId, targetStage, activeData?.updatedAt)
        }
        await fetch('/api/deals/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movingId: activeId, anchorId: overId, insertAfter: true })
        })
        setRefreshKey(Date.now())
      } catch {}
    }
  }

  // Intra-stage reorder: if dragging over another card in same stage, reorder around anchor
  const onDragOver = async (e: DragOverEvent) => {
    const activeId = e.active?.id as string | undefined
    const over = e.over as Over | null
    const overId = (over?.id as string) || undefined
    if (!activeId || !overId || activeId === overId) return
    // Only act when over is a card (not a column)
    if (STAGES.includes(String(overId))) return
    const activeData = (e.active.data?.current || {}) as any
    const overData = (over?.data?.current || {}) as any
    if (!activeData?.stage || !overData?.stage || activeData.stage !== overData.stage) return
    try {
      await fetch('/api/deals/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movingId: activeId, anchorId: overId, insertAfter: true })
      })
      setRefreshKey(Date.now())
    } catch {}
  }

  const openEmail = (deal: any) => { setActiveDeal(deal); setShowEmail(true); setShowSMS(false); setShowSchedule(false); setDrawerOpen(true); if (deal?.emailThreads?.[0]?.id) { window.location.href = `/dashboard/inbox/${deal.emailThreads[0].id}` } else { window.location.href = '/dashboard/inbox' } }
  const openSMS = (deal: any) => { setActiveDeal(deal); setShowSMS(true); setShowEmail(false); setShowSchedule(false) }
  const openSchedule = (deal: any) => { setActiveDeal(deal); setShowSchedule(true); setShowEmail(false); setShowSMS(false) }
  const openDrawer = async (dealId: string) => {
    // Fetch recent emails linked to the deal and upcoming events
    try {
      setDrawerOpen(true)
      const [dealRes, eventsRes] = await Promise.all([
        fetch(`/api/deals/${dealId}`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({})),
        fetch(`/api/calendar/upcoming`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({ events: [] })),
      ])
      setDrawerData({ emails: [], events: eventsRes.events || [] })
      setActiveDeal(dealRes?.deal || { id: dealId, title: 'Deal' })
      const tid = dealRes?.deal?.emailThreads?.[0]?.id || null
      setDrawerThreadId(tid)
    } catch {}
  }

  return (
    <DndContext
      onDragStart={() => { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) { try { (navigator as any).vibrate(10) } catch {} } }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      collisionDetection={closestCenter}
      sensors={sensors}
    >
      <div className="flex items-center justify-between mb-3" role="region" aria-label="Pipeline filters">
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
          <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" onChange={e=>setFilters((f:any)=>({ ...f, archived: e.target.checked }))} /> Show archived</label>
        </div>
        <div>
          <NewDealDialog onCreated={() => { setRefreshKey(Date.now()) }} />
        </div>
      </div>
      {/* TODO: Side drawer for deal details can be added here; using modal pattern for now */}
      <div id="pipeline-root" className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4" role="list" aria-label="Pipeline board">
        {STAGES.map(stage => (
          <div key={stage} role="listitem" aria-label={`Column ${stage}`}>
            <StageColumn stage={stage} filters={filters} onMove={moveStage} refreshKey={refreshKey}
              onEmail={openEmail} onSMS={openSMS} onSchedule={openSchedule}
              icon={{ LEAD:'🧑‍🤝‍🧑', QUALIFIED:'📞', SHOWING:'🏠', OFFER:'🤝', ESCROW:'📑', CLOSED:'🔑', LOST:'❌' }[stage]}
              onOpen={openDrawer}
            />
          </div>
        ))}
      </div>
      {/* Side Drawer */}
      <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-40" onClick={()=>setDrawerOpen(false)}>
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background border-l overflow-y-auto" onClick={e=>e.stopPropagation()}>
            {/* Thread Viewer */}
            <div className="p-4 space-y-3">
              <div className="font-semibold">{activeDeal?.title || 'Deal'}</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="min-h-[320px]">
                  {drawerThreadId ? (
                    <DealThreadPanel dealId={activeDeal?.id} threadId={drawerThreadId} />
                  ) : (
                    <div className="text-xs text-muted-foreground">No linked email thread</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Upcoming events</div>
                  <div className="space-y-2 mt-2">
                    {drawerData.events.slice(0,3).map((e:any)=>(
                      <motion.div key={e.id} className="p-2 border rounded" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="text-sm">{e.summary || 'Event'}</div>
                        <div className="text-xs text-muted-foreground">{e.start?.dateTime || e.start?.date}</div>
                      </motion.div>
                    ))}
                    {drawerData.events.length===0 && <div className="text-xs text-muted-foreground">No upcoming events</div>}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
      <AnimatePresence>
      {showEmail && activeDeal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .98, opacity: 0 }} className="bg-background border rounded p-4 w-full max-w-lg space-y-2 shadow-2xl">
            <div className="font-semibold">Email {activeDeal.title}</div>
            <div className="text-xs text-muted-foreground">Subject defaults to "Re: original subject" when replying</div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowEmail(false)} className="px-2 py-1 border rounded text-xs">Close</button>
              <a href={`/dashboard/inbox/${activeDeal?.emailThreads?.[0]?.id || ''}`} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">Open Thread</a>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
      <AnimatePresence>
      {showSMS && activeDeal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .98, opacity: 0 }} className="bg-background border rounded p-4 w-full max-w-md space-y-2 shadow-2xl">
            <div className="font-semibold">SMS {activeDeal.title}</div>
            <div className="text-xs text-muted-foreground">Compose SMS in the side panel; if Twilio not connected, you will see a connect prompt.</div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowSMS(false)} className="px-2 py-1 border rounded text-xs">Close</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
      <AnimatePresence>
      {showSchedule && activeDeal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} className="bg-background border rounded p-4 w-full max-w-md space-y-3 shadow-2xl">
            <div className="font-semibold">Schedule for {activeDeal.title}</div>
            <input type="datetime-local" className="w-full border rounded px-2 py-1 bg-background" aria-label="Start" id="cal-start" />
            <input type="datetime-local" className="w-full border rounded px-2 py-1 bg-background" aria-label="End" id="cal-end" />
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Summary" id="cal-summary" />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowSchedule(false)} className="px-2 py-1 border rounded text-xs">Cancel</button>
              <button onClick={async()=>{
                const startLocal = (document.getElementById('cal-start') as HTMLInputElement)?.value
                const endLocal = (document.getElementById('cal-end') as HTMLInputElement)?.value
                const summary = (document.getElementById('cal-summary') as HTMLInputElement)?.value
                if (!startLocal || !endLocal) return
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
                const startISO = new Date(startLocal).toISOString()
                const endISO = new Date(endLocal).toISOString()
                const res = await fetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, start: startISO, end: endISO, timeZone: tz }) })
                if (res.ok) { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Appointment scheduled' } })) }
                setShowSchedule(false)
              }} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs">Create</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </DndContext>
  )
}

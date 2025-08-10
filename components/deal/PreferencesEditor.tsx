"use client"

import { useEffect, useState } from 'react'

export default function PreferencesEditor({ dealId }: { dealId: string }) {
  const [pref, setPref] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { /* could fetch existing prefs via deal loader */ }, [])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/deals/${dealId}/preferences`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pref) })
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="border rounded px-2 py-1 bg-background" placeholder="Price Min" value={pref.priceMin ?? ''} onChange={e=>setPref((p:any)=>({ ...p, priceMin: e.target.value ? Number(e.target.value) : null }))} />
        <input className="border rounded px-2 py-1 bg-background" placeholder="Price Max" value={pref.priceMax ?? ''} onChange={e=>setPref((p:any)=>({ ...p, priceMax: e.target.value ? Number(e.target.value) : null }))} />
        <input className="border rounded px-2 py-1 bg-background" placeholder="Beds" value={pref.beds ?? ''} onChange={e=>setPref((p:any)=>({ ...p, beds: e.target.value ? Number(e.target.value) : null }))} />
        <input className="border rounded px-2 py-1 bg-background" placeholder="Baths" value={pref.baths ?? ''} onChange={e=>setPref((p:any)=>({ ...p, baths: e.target.value ? Number(e.target.value) : null }))} />
      </div>
      <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Neighborhoods" value={pref.neighborhoods ?? ''} onChange={e=>setPref((p:any)=>({ ...p, neighborhoods: e.target.value }))} />
      <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Timeline" value={pref.timeline ?? ''} onChange={e=>setPref((p:any)=>({ ...p, timeline: e.target.value }))} />
      <textarea className="w-full border rounded px-2 py-1 bg-background" placeholder="Notes" value={pref.notes ?? ''} onChange={e=>setPref((p:any)=>({ ...p, notes: e.target.value }))} />
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'

export default function NewDealDialog({ onCreated }: { onCreated?: (deal: any) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('BUYER')
  const [city, setCity] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    const res = await fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, type, city, priceTarget: price ? Number(price) : undefined }) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      onCreated?.(data.deal)
      setOpen(false)
      setTitle(''); setCity(''); setPrice('')
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-2 py-1 text-xs border rounded">+ New Deal</button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-full max-w-md p-4 bg-background border rounded-lg space-y-3">
            <div className="font-semibold">New Deal</div>
            <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <select className="border rounded px-2 py-1 bg-background" value={type} onChange={e=>setType(e.target.value)}>
                <option>BUYER</option>
                <option>SELLER</option>
                <option>RENTAL</option>
              </select>
              <input className="border rounded px-2 py-1 bg-background" placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
              <input className="border rounded px-2 py-1 bg-background" placeholder="Price Target" value={price} onChange={e=>setPrice(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1 rounded border text-xs">Cancel</button>
              <button onClick={submit} disabled={!title || loading} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">{loading ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

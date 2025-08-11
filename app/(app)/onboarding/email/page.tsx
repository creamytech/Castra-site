"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch } from '@/lib/http'

export default function EmailStep() {
  const r = useRouter()
  const [watchLabels, setLabels] = useState<string>('INBOX')
  const [threshold, setThresh] = useState<number>(70)
  const [start, setStart] = useState<number>(22)
  const [end, setEnd] = useState<number>(7)
  const [saving, setSaving] = useState(false)

  const save = async (skip = false) => {
    setSaving(true)
    try {
      const body = skip ? {} : { watchLabels: watchLabels.split(',').map(s=>s.trim()).filter(Boolean), threshold, quiet: { start, end } }
      await apiFetch('/api/onboarding/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      r.push('/onboarding/notify')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Email Setup</div>
      <input className="input w-full" placeholder="Labels to watch (comma-separated)" value={watchLabels} onChange={e=>setLabels(e.target.value)} />
      <div>
        <label className="text-sm">Lead threshold: {threshold}</label>
        <input type="range" min={0} max={100} value={threshold} onChange={e=>setThresh(Number(e.target.value))} className="w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="number" placeholder="Quiet start hour" value={start} onChange={e=>setStart(Number(e.target.value))} />
        <input className="input" type="number" placeholder="Quiet end hour" value={end} onChange={e=>setEnd(Number(e.target.value))} />
      </div>
      <div className="flex gap-2">
        <button onClick={()=>save(false)} className="btn-primary" disabled={saving}>Save & Continue</button>
        <button onClick={()=>save(true)} className="btn-ghost" disabled={saving}>Skip</button>
      </div>
    </div>
  )
}



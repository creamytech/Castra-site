"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch } from '@/lib/http'

export default function ToneStep() {
  const r = useRouter()
  const [adjectives, setAdj] = useState<string>('professional, concise, friendly')
  const [dos, setDos] = useState<string>('Keep emails short; Offer 2-3 time windows; Confirm addresses')
  const [donts, setDonts] = useState<string>('No legal advice; No promises; Avoid links unless safe')
  const [samples, setSamples] = useState<string>('Thanks for reaching out...\nHappy to schedule a showing...')
  const [preview, setPreview] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const save = async (skip = false) => {
    setSaving(true)
    try {
      if (skip) { r.push('/onboarding/email'); return }
      const body = {
        adjectives: adjectives.split(',').map(s=>s.trim()).filter(Boolean),
        do: dos.split(';').map(s=>s.trim()).filter(Boolean),
        dont: donts.split(';').map(s=>s.trim()).filter(Boolean),
        sampleEmails: samples.split('\n').filter(Boolean),
      }
      const res = await apiFetch('/api/onboarding/tone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json(); if (res.ok) setPreview(j.styleGuide)
      r.push('/onboarding/email')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Tone</div>
      <input className="input w-full" placeholder="Tone adjectives (comma-separated)" value={adjectives} onChange={e=>setAdj(e.target.value)} />
      <textarea className="input w-full h-20" placeholder="Do (semicolon-separated)" value={dos} onChange={e=>setDos(e.target.value)} />
      <textarea className="input w-full h-20" placeholder="Don't (semicolon-separated)" value={donts} onChange={e=>setDonts(e.target.value)} />
      <textarea className="input w-full h-28" placeholder="1–3 sample emails (newline separated)" value={samples} onChange={e=>setSamples(e.target.value)} />
      {preview && <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(preview, null, 2)}</pre>}
      <div className="flex gap-2">
        <button onClick={()=>save(false)} className="btn-primary" disabled={saving}>Build Style Guide</button>
        <button onClick={()=>save(true)} className="btn-ghost" disabled={saving}>Skip</button>
      </div>
    </div>
  )
}



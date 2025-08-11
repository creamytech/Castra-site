"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch } from '@/lib/http'

export default function ProfileStep() {
  const r = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [signature, setSignature] = useState('')
  const [headshotUrl, setHeadshotUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (skip = false) => {
    setSaving(true)
    try {
      await apiFetch('/api/onboarding/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skip ? {} : { fullName, phone, headshotUrl, signature }) })
      r.push('/onboarding/tone')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Profile</div>
      <input className="input w-full" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} />
      <input className="input w-full" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
      <input className="input w-full" placeholder="Headshot URL" value={headshotUrl} onChange={e=>setHeadshotUrl(e.target.value)} />
      <textarea className="input w-full h-28" placeholder="Email signature" value={signature} onChange={e=>setSignature(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={()=>save(false)} className="btn-primary" disabled={saving}>Save & Continue</button>
        <button onClick={()=>save(true)} className="btn-ghost" disabled={saving}>Skip</button>
      </div>
    </div>
  )
}



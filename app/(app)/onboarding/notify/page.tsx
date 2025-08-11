"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch } from '@/lib/http'

export default function NotifyStep() {
  const r = useRouter()
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [push, setPush] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async (skip = false) => {
    setSaving(true)
    try {
      const channels = skip ? [] : [email && 'email', sms && 'sms', push && 'push'].filter(Boolean)
      await apiFetch('/api/onboarding/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notifChannels: channels }) })
      r.push('/dashboard')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Notifications</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)} /> Email</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sms} onChange={e=>setSms(e.target.checked)} /> SMS</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={push} onChange={e=>setPush(e.target.checked)} /> Push</label>
      <div className="flex gap-2">
        <button onClick={()=>save(false)} className="btn-primary" disabled={saving}>Finish</button>
        <button onClick={()=>save(true)} className="btn-ghost" disabled={saving}>Skip</button>
      </div>
    </div>
  )
}



"use client"

import { useEffect, useState } from 'react'

export default function AutopilotPanel({ userId, stage }: { userId: string; stage: string }) {
  const [policy, setPolicy] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/autonomy?stage=${stage}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setPolicy(data.policy || { stage, level: 'SUGGEST' })
    }
    load()
  }, [stage])

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/autonomy`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policy) })
    setSaving(false)
  }

  if (!policy) return null
  return (
    <div className="p-3 border rounded-lg bg-card space-y-3">
      <div className="font-semibold">Autopilot</div>
      <div className="space-y-2">
        <label className="text-xs">Autonomy Level</label>
        <select className="w-full border rounded px-2 py-1 bg-background" value={policy.level} onChange={e => setPolicy({ ...policy, level: e.target.value })}>
          <option value="SUGGEST">Suggest</option>
          <option value="ASK">Ask</option>
          <option value="AUTO">Auto</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">Quiet Start (hour)</label>
          <input type="number" className="w-full border rounded px-2 py-1 bg-background" value={policy.quietStart ?? ''} onChange={e => setPolicy({ ...policy, quietStart: e.target.value ? parseInt(e.target.value) : null })} />
        </div>
        <div>
          <label className="text-xs">Quiet End (hour)</label>
          <input type="number" className="w-full border rounded px-2 py-1 bg-background" value={policy.quietEnd ?? ''} onChange={e => setPolicy({ ...policy, quietEnd: e.target.value ? parseInt(e.target.value) : null })} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="w-full px-3 py-2 rounded bg-primary text-primary-foreground text-sm">{saving ? 'Saving…' : 'Save'}</button>
    </div>
  )
}

"use client"

import { useState } from 'react'

export default function EmailComposer({ dealId, to }: { dealId: string; to?: string }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tone, setTone] = useState('friendly')
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    const res = await fetch('/api/messaging/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body, dealId }) })
    const data = await res.json()
    setSending(false)
    if (res.ok) alert('Email sent')
    else alert(data.error || 'Failed')
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 items-center">
        <label className="text-xs">Tone</label>
        <select value={tone} onChange={e=>setTone(e.target.value)} className="col-span-3 border rounded px-2 py-1 bg-background">
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="concise">Concise</option>
        </select>
      </div>
      <input className="w-full border rounded px-2 py-1 bg-background" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
      <textarea className="w-full border rounded px-2 py-1 bg-background h-40" placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />
      <div className="flex justify-end">
        <button onClick={send} disabled={sending || !to} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">{sending ? 'Sending…' : 'Send'}</button>
      </div>
    </div>
  )
}

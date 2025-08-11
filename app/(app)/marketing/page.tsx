'use client'

import { useState } from 'react'

export default function MarketingPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const send = async () => {
    setStatus('Sending...')
    const res = await fetch('/api/messaging/email/sendgrid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, html }) })
    const js = await res.json().catch(()=>({}))
    setStatus(res.ok ? 'Sent' : `Error: ${js.error || res.status}`)
  }
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Marketing</h1>
      <div className="space-y-2">
        <input className="w-full border rounded p-2" placeholder="Recipient email" value={to} onChange={e=>setTo(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
        <textarea className="w-full border rounded p-2 h-40" placeholder="HTML content" value={html} onChange={e=>setHtml(e.target.value)} />
        <button onClick={send} className="px-4 py-2 bg-primary text-primary-foreground rounded">Send eBlast</button>
        {status && <div className="text-sm text-muted-foreground">{status}</div>}
      </div>
    </div>
  )
}



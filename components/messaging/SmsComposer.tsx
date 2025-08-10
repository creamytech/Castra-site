"use client"

import { useMemo, useState } from 'react'

export default function SmsComposer({ dealId, to }: { dealId: string; to?: string }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const count = useMemo(() => body.length, [body])

  const send = async () => {
    setSending(true)
    const res = await fetch('/api/messaging/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, body, dealId }) })
    const data = await res.json()
    setSending(false)
    if (res.ok) alert('SMS sent')
    else alert(data.error || 'Failed')
  }

  return (
    <div className="space-y-2">
      <textarea className="w-full border rounded px-2 py-1 bg-background h-32" placeholder="Message" value={body} onChange={e=>setBody(e.target.value)} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>{count}/160</div>
        <div className="flex items-center gap-2">
          <span>Std rates may apply</span>
          <button onClick={send} disabled={sending || !to || count === 0} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </div>
  )
}

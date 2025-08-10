"use client"

export default function MessageActions({ messageId, gmailId, threadId }: { messageId?: string; gmailId?: string; threadId?: string }) {
  const extract = async () => {
    const res = await fetch('/api/inbox/extract-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: messageId, gmailId, threadId }) })
    const data = await res.json()
    if (res.ok) alert('Deal created')
    else alert(data.error || 'Failed')
  }
  return (
    <div className="flex gap-2 text-xs">
      <button onClick={extract} className="px-2 py-1 border rounded">Extract Lead</button>
    </div>
  )
}

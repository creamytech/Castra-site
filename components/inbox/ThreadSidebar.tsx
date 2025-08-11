"use client"

import { useState } from 'react'
import useSWR from 'swr'
import { apiFetch } from '@/lib/http'
import { STATUS_LABEL } from './InboxNew'

async function createDealFromThread(threadId: string) {
  const res = await apiFetch(`/api/inbox/threads/${threadId}/create-deal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  return res.json()
}

const fetcher = (url: string) => apiFetch(url).then(r => r.json())

export default function ThreadSidebar({ threadId }: { threadId: string }) {
  const [dealId, setDealId] = useState('')
  const { data } = useSWR(threadId ? `/api/inbox/threads/${threadId}` : null, fetcher)
  const thread = data?.thread
  const attach = async () => {
    if (!dealId) return
    await apiFetch(`/api/inbox/threads/${threadId}/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }) })
    alert('Attached')
  }
  const createDeal = async () => {
    const r = await createDealFromThread(threadId)
    if (r?.deal?.id) {
      setDealId(r.deal.id)
      alert('Deal created from thread')
    }
  }
  return (
    <div className="p-3 border rounded bg-card space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">Thread</div>
        {thread?.status && (
          <div className="text-xs">
            <span className="badge" data-status={thread.status}>{STATUS_LABEL[thread.status as keyof typeof STATUS_LABEL] || thread.status}</span>
            {typeof thread.score === 'number' && <span className="chip" style={{ marginLeft: 6 }}>Score {thread.score}</span>}
          </div>
        )}
      </div>
      <div className="font-semibold text-sm">Deal</div>
      <div className="flex gap-2">
        <input value={dealId} onChange={e=>setDealId(e.target.value)} placeholder="Deal ID" className="flex-1 border rounded px-2 py-1 bg-background text-sm" />
        <button onClick={attach} className="px-2 py-1 rounded border text-xs">Attach</button>
      </div>
      <button onClick={createDeal} className="px-2 py-1 rounded border text-xs w-full">+ New Deal from email</button>
    </div>
  )
}

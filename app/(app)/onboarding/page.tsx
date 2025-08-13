'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const [step, setStep] = useState(1)
  const { data: statusData, mutate } = useSWR(status === 'authenticated' ? '/api/onboarding/status' : null, fetcher)

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login'
    }
  }, [status])

  if (status !== 'authenticated') return null

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="text-2xl font-semibold">Welcome, {session?.user?.name || session?.user?.email}</div>
        <div className="text-sm text-muted-foreground">Let’s connect your inbox and calendar to get Castra working for you.</div>
      </div>
      <div className="space-y-6">
        <section className="border rounded-lg p-4">
          <div className="font-medium">Step 1: Permissions</div>
          <div className="text-sm text-muted-foreground">Connected Google account: {statusData?.email || '—'}</div>
          <div className="mt-2 flex gap-2">
            <a href="/api/google/reconnect" className="px-3 py-1 text-sm rounded-md border">Reconnect Google</a>
            <button onClick={()=>mutate()} className="px-3 py-1 text-sm rounded-md border">Re-check</button>
          </div>
        </section>
        <section className="border rounded-lg p-4">
          <div className="font-medium">Step 2: Inbox sync</div>
          <div className="text-sm text-muted-foreground">Last sync: {statusData?.lastSync ? new Date(statusData.lastSync).toLocaleString() : 'Not synced'}</div>
          <div className="mt-2 flex gap-2">
            <button onClick={async ()=>{ await fetch('/api/gmail/sync', { method: 'POST' }); mutate() }} className="px-3 py-1 text-sm rounded-md border">Start sync</button>
            <button onClick={async ()=>{ const res = await fetch('/api/cron/gmail/incremental'); if (res.ok) mutate() }} className="px-3 py-1 text-sm rounded-md border">Incremental sync</button>
          </div>
        </section>
        <section className="border rounded-lg p-4">
          <div className="font-medium">Step 3: Calendar preview</div>
          <a href="/dashboard/calendar" className="px-3 py-1 text-sm rounded-md border">View next 7 days</a>
        </section>
        <section className="border rounded-lg p-4">
          <div className="font-medium">Step 4: Send a test</div>
          <button onClick={async ()=>{ await fetch('/api/chat/create-event', { method: 'POST', body: JSON.stringify({ test: true }) }); }} className="px-3 py-1 text-sm rounded-md border">Send test</button>
        </section>
        <div className="text-right">
          <a href="/dashboard/inbox" className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Finish</a>
        </div>
      </div>
    </div>
  )
}



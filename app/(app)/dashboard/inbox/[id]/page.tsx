'use client'

import InboxThread from '@/components/inbox/InboxThread'
import ThreadSidebar from '@/components/inbox/ThreadSidebar'
import { useParams } from 'next/navigation'

export default function DashboardInboxThreadPage() {
  const params = useParams()
  const threadId = String(params?.id || '')

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4 max-w-6xl mx-auto">
      <div className="md:col-span-4">
        <InboxThread threadId={threadId} />
      </div>
      <div className="md:col-span-1">
        {threadId && <ThreadSidebar threadId={threadId} />}
      </div>
    </div>
  )
}

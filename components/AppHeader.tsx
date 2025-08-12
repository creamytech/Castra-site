'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Breadcrumbs from './Breadcrumbs'
import NotificationsBell from './NotificationsBell'
import { UserMenu } from './user-menu'

export default function AppHeader() {
  const { data: session } = useSession()
  const [syncing, setSyncing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  if (!session) return null

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date().toLocaleTimeString()), 60000)
    setLastUpdated(new Date().toLocaleTimeString())
    return () => clearInterval(id)
  }, [])

  const doRefresh = async () => {
    try {
      setSyncing(true)
      await fetch('/api/inbox/sync', { method: 'POST' }).catch(()=>{})
      setLastUpdated(new Date().toLocaleTimeString())
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 sm:px-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 hidden md:block">
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {syncing ? 'Syncing…' : lastUpdated ? `Updated ${lastUpdated}` : ''}
          </div>
          <button onClick={doRefresh} className="text-xs px-2 py-1 rounded border hover:bg-muted" disabled={syncing}>
            {syncing ? 'Refreshing…' : 'Refresh'}
          </button>
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

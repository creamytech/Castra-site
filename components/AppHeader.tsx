'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import QuickActions from './QuickActions'
import NotificationsBell from './NotificationsBell'

export default function AppHeader() {
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 sm:px-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          <nav className="text-xs text-muted-foreground hidden md:flex items-center gap-1" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="text-foreground">Home</span>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <QuickActions />
          
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {session.user?.name || session.user?.email}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

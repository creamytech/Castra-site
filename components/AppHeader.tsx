'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import QuickActions from './QuickActions'

export default function AppHeader() {
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Castra
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
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

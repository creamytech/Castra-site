'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import QuickActions from './QuickActions'
import AppHeader from './AppHeader'
import CommandPalette from './CommandPalette'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export default function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  const [session, setSession] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only use useSession on the client side
  const { data: sessionData } = useSession()

  useEffect(() => {
    if (mounted) {
      setSession(sessionData)
    }
  }, [sessionData, mounted])

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [])

  // If not mounted yet, show a loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Loading...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {showSidebar && <Sidebar />}
      <div className={`${showSidebar ? 'ml-64' : ''} transition-all duration-300`}>
        <AppHeader />
        <main className="p-6 pb-16">
          {children}
        </main>
      </div>
      <CommandPalette isOpen={cmdOpen} onClose={()=>setCmdOpen(false)} />
    </div>
  )
}

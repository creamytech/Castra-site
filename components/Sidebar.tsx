'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

interface NavItem {
  id: string
  label: string
  icon: string
  href: string
  badge?: string
}

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)

  // Persist collapsed state
  useEffect(() => {
    try {
      const v = localStorage.getItem('sidebarCollapsed')
      if (v === 'false') setIsCollapsed(false)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('sidebarCollapsed', String(isCollapsed)) } catch {}
  }, [isCollapsed])

  // Unread counts
  const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({}))
  const { data: notifData } = useSWR('/api/notifications?unread=true', fetcher, { refreshInterval: 30000 }) as any
  const notificationsUnread = Number(notifData?.unreadCount || 0)
  const { data: inboxData } = useSWR('/api/inbox/threads?limit=50', fetcher, { refreshInterval: 30000 }) as any
  const inboxUnread = Array.isArray(inboxData?.threads) ? inboxData.threads.filter((t:any)=>t.unread).length : 0

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/dashboard' },
    { id: 'chat', label: 'AI Chat', icon: '💬', href: '/chat' },
    { id: 'inbox', label: 'Inbox', icon: '📧', href: '/dashboard/inbox' },
    { id: 'crm', label: 'CRM', icon: '👥', href: '/crm' },
    { id: 'calendar', label: 'Calendar', icon: '📅', href: '/calendar' },
    { id: 'marketing', label: 'Marketing', icon: '📣', href: '/marketing' },
    { id: 'mls', label: 'MLS', icon: '🏷️', href: '/mls' },
    { id: 'documents', label: 'Documents', icon: '📄', href: '/documents' },
    { id: 'reports', label: 'Reports', icon: '📊', href: '/reports' },
    { id: 'brief', label: 'Daily Brief', icon: '🗒', href: '/daily-brief' },
    { id: 'profile', label: 'Profile', icon: '👤', href: '/settings/profile' },
    { id: 'admin', label: 'Admin', icon: '⚙️', href: '/admin' },
  ]

  if (!session) {
    return null
  }

  return (
    <div
      className={`group fixed left-0 top-0 h-full bg-card text-card-foreground border-r border-border overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } hover:w-64`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" aria-label="Castra Home" className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            {!isCollapsed && (
              <span className="font-bold text-lg text-foreground">Castra</span>
            )}
          </Link>
          <div className="hidden md:block text-xs text-muted-foreground">
            {isCollapsed ? '' : ' '}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href)
            const baseClasses = 'relative flex items-center rounded-lg transition-colors w-full'
            const spacing = isCollapsed ? 'justify-center py-3' : 'space-x-3 px-3 py-2'
            const activeClasses = isActive ? 'bg-muted font-medium' : 'text-foreground hover:bg-accent hover:text-accent-foreground'
            const count = item.id === 'inbox' ? inboxUnread : item.id === 'chat' ? 0 : item.id === 'notifications' ? notificationsUnread : 0
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`${baseClasses} ${spacing} ${activeClasses}`}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" aria-hidden></span>}
                  <span className="text-xl">{item.icon}</span>
                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="font-medium truncate">{item.label}</span>
                      {count > 0 && (
                        <span className="px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                          {count}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground truncate">
                  {session.user?.name || 'User'}
                </div>
                <div className="text-muted-foreground text-xs truncate">
                  {session.user?.email}
                </div>
              </div>
            </div>
          )}
          <button onClick={()=>signOut()} className="ml-auto text-xs px-2 py-1 rounded border">Log out</button>
        </div>
      </div>
    </div>
  )
}

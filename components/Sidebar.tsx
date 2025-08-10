'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CastraWordmark } from '@/components/brand/CastraWordmark'

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
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/dashboard' },
    { id: 'chat', label: 'AI Chat', icon: '💬', href: '/chat' },
    { id: 'inbox', label: 'Inbox', icon: '📧', href: '/inbox' },
    { id: 'crm', label: 'CRM', icon: '👥', href: '/crm' },
    { id: 'calendar', label: 'Calendar', icon: '📅', href: '/calendar' },
    { id: 'admin', label: 'Admin', icon: '⚙️', href: '/admin' },
  ]

  if (!session) {
    return null
  }

  return (
    <div className={`fixed left-0 top-0 h-full bg-card text-card-foreground border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <CastraWordmark size="md" />
          ) : (
            <Link href="/dashboard" className="text-2xl" aria-label="Castra Home">✨</Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-full">
                          {item.badge}
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
        </div>
      </div>
    </div>
  )
}

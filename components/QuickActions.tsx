'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface QuickAction {
  id: string
  label: string
  icon: string
  href: string
  description: string
}

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const quickActions: QuickAction[] = [
    {
      id: 'chat',
      label: 'Start Chat',
      icon: '💬',
      href: '/chat',
      description: 'Begin a conversation with Castra AI'
    },
    {
      id: 'lead',
      label: 'Add Lead',
      icon: '👤',
      href: '/crm',
      description: 'Create a new contact or lead'
    },
    {
      id: 'inbox',
      label: 'Check Inbox',
      icon: '📧',
      href: '/inbox',
      description: 'View recent emails and summaries'
    },
    {
      id: 'calendar',
      label: 'Schedule Meeting',
      icon: '📅',
      href: '/calendar',
      description: 'Book a meeting or view calendar'
    }
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleActionClick = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
      >
        <span className="text-lg">⚡</span>
        <span className="font-medium">Quick Actions</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.href)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <span className="text-2xl">{action.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-white">
                      {action.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {action.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

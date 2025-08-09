'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { isFeatureEnabled } from '@/lib/config'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

interface Account {
  id: string
  provider: string
  type: string
  access_token?: string
  refresh_token?: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      setLoading(false)
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, session])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (provider: string) => {
    signIn(provider, { callbackUrl: '/connect' })
  }

  const isConnected = (provider: string) => {
    const hasDatabaseAccount = accounts.some(account => account.provider === provider && account.access_token)
    
    if (provider === 'google' && session) {
      const hasSessionTokens = !!(session as any).accessToken || !!(session as any).refreshToken
      return hasDatabaseAccount || hasSessionTokens
    }
    
    return hasDatabaseAccount
  }

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'chat') {
      router.push('/chat')
    } else if (tab === 'inbox') {
      router.push('/inbox')
    } else if (tab === 'crm') {
      router.push('/crm')
    } else if (tab === 'calendar') {
      router.push('/calendar')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-gray-800 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-gray-800 dark:text-white">Not authenticated</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ThemeToggle />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Castra Dashboard</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Welcome back, {session.user.name || session.user.email}!
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-2 mb-8">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: '🏠' },
              { id: 'chat', label: 'AI Chat', icon: '💬' },
              { id: 'inbox', label: 'Inbox', icon: '📧' },
              { id: 'crm', label: 'CRM', icon: '👥' },
              { id: 'calendar', label: 'Calendar', icon: '📅' },
              { id: 'admin', label: 'Admin', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="card">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Integrations Section */}
              <div>
                <h2 className="mb-6">Integrations</h2>
                <div className="space-y-4">
                  {isFeatureEnabled('gmail') ? (
                    <div className="integration-card">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">🔗</div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">Google (Gmail + Calendar)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {isConnected('google') ? 'Connected' : 'Not connected'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`status-indicator ${isConnected('google') ? 'status-connected' : 'status-disconnected'}`}>
                          {isConnected('google') ? 'Connected' : 'Disconnected'}
                        </span>
                        {!isConnected('google') && (
                          <button
                            onClick={() => handleConnect('google')}
                            className="btn-primary text-sm py-2 px-4"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="integration-card">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">🔗</div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">Google Integration</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Not configured</div>
                        </div>
                      </div>
                      <span className="status-indicator status-disconnected">Not Available</span>
                    </div>
                  )}

                  {isFeatureEnabled('gmail') ? (
                    <div className="integration-card">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">📧</div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">Outlook (Email + Calendar)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {isConnected('azure-ad') ? 'Connected' : 'Not connected'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`status-indicator ${isConnected('azure-ad') ? 'status-connected' : 'status-disconnected'}`}>
                          {isConnected('azure-ad') ? 'Connected' : 'Disconnected'}
                        </span>
                        {!isConnected('azure-ad') && (
                          <button
                            onClick={() => handleConnect('azure-ad')}
                            className="btn-primary text-sm py-2 px-4"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="integration-card">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">📧</div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">Outlook Integration</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Not configured</div>
                        </div>
                      </div>
                      <span className="status-indicator status-disconnected">Not Available</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Link href="/chat" className="quick-action-card group">
                    <div className="text-center">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💬</div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-2">AI Chat</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Start a conversation with Castra's AI assistant</p>
                      <div className="mt-4">
                        <span className="status-indicator status-ready">Ready</span>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/inbox" className="quick-action-card group">
                    <div className="text-center">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📧</div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Email Inbox</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage your email communications</p>
                      <div className="mt-4">
                        <span className={`status-indicator ${isConnected('google') || isConnected('azure-ad') ? 'status-connected' : 'status-disconnected'}`}>
                          {isConnected('google') || isConnected('azure-ad') ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/crm" className="quick-action-card group">
                    <div className="text-center">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-2">CRM</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage contacts, leads, and deals</p>
                      <div className="mt-4">
                        <span className="status-indicator status-ready">Ready</span>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/calendar" className="quick-action-card group">
                    <div className="text-center">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📅</div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Calendar</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Schedule meetings and manage your calendar</p>
                      <div className="mt-4">
                        <span className={`status-indicator ${isConnected('google') ? 'status-connected' : 'status-disconnected'}`}>
                          {isConnected('google') ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Account Information */}
              <div className="card">
                <h3 className="mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Name</p>
                    <p className="text-gray-800 dark:text-white">{session.user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-gray-800 dark:text-white">{session.user.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">User ID</p>
                    <p className="text-gray-800 dark:text-white font-mono text-xs">{session.user.id}</p>
                  </div>
                  {session.user.oktaId && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Okta ID</p>
                      <p className="text-gray-800 dark:text-white font-mono text-xs">{session.user.oktaId}</p>
                    </div>
                  )}
                  {session.user.groups && session.user.groups.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600 dark:text-gray-400">Groups</p>
                      <p className="text-gray-800 dark:text-white">{session.user.groups.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="mb-2">AI Chat</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Chat with Castra's AI assistant</p>
              <Link href="/chat" className="btn-primary">
                Open Chat
              </Link>
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="mb-2">Email Inbox</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Manage your email communications</p>
              <Link href="/inbox" className="btn-primary">
                Open Inbox
              </Link>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="mb-2">CRM</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Manage contacts, leads, and deals</p>
              <Link href="/crm" className="btn-primary">
                Open CRM
              </Link>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="mb-2">Calendar</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Schedule meetings and manage your calendar</p>
              <Link href="/calendar" className="btn-primary">
                Open Calendar
              </Link>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="mb-2">Admin Panel</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Administrative functions</p>
              <Link href="/admin" className="btn-primary">
                Open Admin
              </Link>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="text-center mt-8">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

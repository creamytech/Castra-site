'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { isFeatureEnabled } from '@/lib/config'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
    if (session?.user?.id) {
      fetchAccounts()
    }
  }, [session?.user?.id])

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
    return accounts.some(account => account.provider === provider && account.access_token)
  }

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'chat') {
      router.push('/chat')
    } else if (tab === 'inbox') {
      router.push('/inbox')
    } else if (tab === 'crm') {
      router.push('/crm')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Not authenticated</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Castra Dashboard
          </h1>
          <p className="text-xl text-gray-300">
            Welcome back, {session.user.name || session.user.email}!
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-800 rounded-lg p-2 mb-8">
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
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-500 bg-opacity-20">
                      <span className="text-2xl">💬</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">AI Chat</p>
                      <p className="text-2xl font-bold text-white">Ready</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-500 bg-opacity-20">
                      <span className="text-2xl">📧</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">Email</p>
                      <p className="text-2xl font-bold text-white">
                        {isConnected('google') || isConnected('azure-ad') ? 'Connected' : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-500 bg-opacity-20">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-400">CRM</p>
                      <p className="text-2xl font-bold text-white">Ready</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/chat" className="bg-blue-600 hover:bg-blue-700 rounded-lg p-4 text-center transition-colors">
                    <div className="text-2xl mb-2">💬</div>
                    <div className="text-white font-medium">Start Chat</div>
                    <div className="text-blue-200 text-sm">AI Assistant</div>
                  </Link>
                  
                  <Link href="/inbox" className="bg-green-600 hover:bg-green-700 rounded-lg p-4 text-center transition-colors">
                    <div className="text-2xl mb-2">📧</div>
                    <div className="text-white font-medium">Check Inbox</div>
                    <div className="text-green-200 text-sm">Email Management</div>
                  </Link>
                  
                  <Link href="/crm" className="bg-purple-600 hover:bg-purple-700 rounded-lg p-4 text-center transition-colors">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-white font-medium">CRM</div>
                    <div className="text-purple-200 text-sm">Contact Management</div>
                  </Link>
                  
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="text-white font-medium">Calendar</div>
                    <div className="text-gray-300 text-sm">Coming Soon</div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="text-white">{session.user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="text-white">{session.user.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">User ID</p>
                    <p className="text-white font-mono text-xs">{session.user.id}</p>
                  </div>
                  {session.user.oktaId && (
                    <div>
                      <p className="text-gray-400">Okta ID</p>
                      <p className="text-white font-mono text-xs">{session.user.oktaId}</p>
                    </div>
                  )}
                  {session.user.groups && session.user.groups.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-gray-400">Groups</p>
                      <p className="text-white">{session.user.groups.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
                <div className="space-y-4">
                  {isFeatureEnabled('gmail') ? (
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">G</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Gmail & Calendar</p>
                          <p className="text-gray-400 text-sm">Google Workspace</p>
                        </div>
                      </div>
                      {isConnected('google') ? (
                        <span className="text-green-400 text-sm font-medium">Connected</span>
                      ) : (
                        <button
                          onClick={() => handleConnect('google')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg opacity-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">G</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Gmail & Calendar</p>
                          <p className="text-gray-400 text-sm">Not configured</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">Unavailable</span>
                    </div>
                  )}

                  {isFeatureEnabled('gmail') ? (
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">O</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Outlook & Calendar</p>
                          <p className="text-gray-400 text-sm">Microsoft 365</p>
                        </div>
                      </div>
                      {isConnected('azure-ad') ? (
                        <span className="text-green-400 text-sm font-medium">Connected</span>
                      ) : (
                        <button
                          onClick={() => handleConnect('azure-ad')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg opacity-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">O</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">Outlook & Calendar</p>
                          <p className="text-gray-400 text-sm">Not configured</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">Unavailable</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Chat</h3>
              <p className="text-gray-400 mb-6">Chat with Castra's AI assistant</p>
              <Link 
                href="/chat"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                Open Chat
              </Link>
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-semibold text-white mb-2">Email Inbox</h3>
              <p className="text-gray-400 mb-6">Manage your email communications</p>
              <Link 
                href="/inbox"
                className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                Open Inbox
              </Link>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-white mb-2">CRM</h3>
              <p className="text-gray-400 mb-6">Manage contacts, leads, and deals</p>
              <Link 
                href="/crm"
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
              >
                Open CRM
              </Link>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-white mb-2">Calendar</h3>
              <p className="text-gray-400 mb-6">Schedule management coming soon</p>
              <div className="inline-block px-6 py-3 bg-gray-600 rounded-lg text-gray-300 font-medium">
                Coming Soon
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Admin Panel</h3>
              <p className="text-gray-400 mb-6">Administrative functions</p>
              <Link 
                href="/admin"
                className="inline-block px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
              >
                Open Admin
              </Link>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="text-center mt-8">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

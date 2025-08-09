'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import MainLayout from '@/components/MainLayout'
import Toast from '@/components/Toast'

export const dynamic = 'force-dynamic'

interface Account {
  id: string
  provider: string
  access_token: string
  refresh_token: string
}

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null)
  const [status, setStatus] = useState<string>('loading')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only use useSession on the client side
  const { data: sessionData, status: sessionStatus } = useSession()

  useEffect(() => {
    if (mounted) {
      setSession(sessionData)
      setStatus(sessionStatus)
    }
  }, [sessionData, sessionStatus, mounted])

  const router = useRouter()

  useEffect(() => {
    if (mounted) {
      if (sessionStatus === 'authenticated') {
        setLoading(false)
      } else if (sessionStatus === 'unauthenticated') {
        router.push('/auth/signin')
      }
    }
  }, [sessionStatus, router, mounted])

  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])

  const handleConnect = (provider: string) => {
    if (provider === 'google') {
      signIn('google', { callbackUrl: '/connect' })
    } else if (provider === 'azure-ad') {
      signIn('azure-ad', { callbackUrl: '/connect' })
    }
  }

  const isConnected = (provider: string) => {
    // Check database accounts first (if adapter was enabled)
    const hasDatabaseAccount = accounts.some(account => account.provider === provider && account.access_token)

    // Also check session tokens for Google (since we're using JWT strategy)
    if (provider === 'google' && session) {
      const hasSessionTokens = !!(session as any).accessToken || !!(session as any).refreshToken
      return hasDatabaseAccount || hasSessionTokens
    }
    return hasDatabaseAccount
  }

  const isFeatureEnabled = (feature: string) => {
    // For now, all features are enabled
    return true
  }

  if (!mounted) {
    return (
      <MainLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Loading...</div>
        </div>
      </MainLayout>
    )
  }

  if (status === 'loading') {
    return (
      <MainLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Loading...</div>
        </div>
      </MainLayout>
    )
  }

  if (!session) {
    return (
      <MainLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Not authenticated</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Castra Dashboard</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Welcome back, {session.user.name || session.user.email}!
          </p>
        </div>

        <div className="space-y-8">
          {/* Integrations Section */}
          <div className="card">
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
          <div className="card">
            <h2 className="mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="quick-action-card group">
                <div className="text-center">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💬</div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">AI Chat</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Start a conversation with Castra's AI assistant</p>
                  <div className="mt-4">
                    <span className="status-indicator status-ready">Ready</span>
                  </div>
                </div>
              </div>
              
              <div className="quick-action-card group">
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
              </div>
              
              <div className="quick-action-card group">
                <div className="text-center">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">CRM</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage contacts, leads, and deals</p>
                  <div className="mt-4">
                    <span className="status-indicator status-ready">Ready</span>
                  </div>
                </div>
              </div>
              
              <div className="quick-action-card group">
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
              </div>
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
      </div>
    </MainLayout>
  )
}

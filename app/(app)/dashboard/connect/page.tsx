'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Account {
  id: string
  provider: string
  type: string
  access_token?: string
  refresh_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}

interface ConnectionStatus {
  provider: string
  connected: boolean
  lastRefresh?: string
  accessToken?: string
  refreshToken?: string
}

export default function ConnectPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus[]>([])
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAccounts()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        
        // Process connection status
        const statuses: ConnectionStatus[] = [
          {
            provider: 'google',
            connected: data.accounts?.some((acc: Account) => acc.provider === 'google') || false,
            lastRefresh: data.accounts?.find((acc: Account) => acc.provider === 'google')?.expires_at 
              ? new Date(data.accounts.find((acc: Account) => acc.provider === 'google')!.expires_at! * 1000).toLocaleString()
              : undefined,
            accessToken: data.accounts?.find((acc: Account) => acc.provider === 'google')?.access_token ? 'Present' : undefined,
            refreshToken: data.accounts?.find((acc: Account) => acc.provider === 'google')?.refresh_token ? 'Present' : undefined
          },
          {
            provider: 'azure-ad',
            connected: data.accounts?.some((acc: Account) => acc.provider === 'azure-ad') || false,
            lastRefresh: data.accounts?.find((acc: Account) => acc.provider === 'azure-ad')?.expires_at 
              ? new Date(data.accounts.find((acc: Account) => acc.provider === 'azure-ad')!.expires_at! * 1000).toLocaleString()
              : undefined,
            accessToken: data.accounts?.find((acc: Account) => acc.provider === 'azure-ad')?.access_token ? 'Present' : undefined,
            refreshToken: data.accounts?.find((acc: Account) => acc.provider === 'azure-ad')?.refresh_token ? 'Present' : undefined
          }
        ]
        setConnectionStatus(statuses)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (provider: string) => {
    // Redirect to sign-in with specific provider
    window.location.href = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(window.location.href)}`
  }

  const handleDisconnect = async (provider: string) => {
    try {
      const response = await fetch('/api/accounts/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })
      
      if (response.ok) {
        // Refresh accounts after disconnection
        fetchAccounts()
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const isConnected = (provider: string) => {
    return accounts.some(account => account.provider === provider)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-800 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-800 dark:text-white">You need to sign in.</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="h1">Dashboard</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          Welcome to your Castra dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Stats */}
        <div className="card">
          <h2 className="h2 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Active Leads</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">8</div>
              <div className="text-sm text-green-600 dark:text-green-400">Showings This Week</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Pending Offers</div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">24</div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Unread Emails</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="h2 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💬</div>
                <div>
                  <div className="font-medium">Start AI Chat</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Ask Castra anything</div>
                </div>
              </div>
            </button>

            <button className="w-full p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📧</div>
                <div>
                  <div className="font-medium">Check Inbox</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Review emails</div>
                </div>
              </div>
            </button>

            <button className="w-full p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📅</div>
                <div>
                  <div className="font-medium">Schedule Meeting</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Book appointments</div>
                </div>
              </div>
            </button>

            <button className="w-full p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">👥</div>
                <div>
                  <div className="font-medium">Add Lead</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Create new contact</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="card mt-8">
        <h2 className="h2 mb-4">Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {connectionStatus.map((status) => (
            <div key={status.provider} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize">
                  {status.provider === 'google' ? 'Gmail & Calendar' : 
                   status.provider === 'azure-ad' ? 'Microsoft 365' : status.provider}
                </span>
                <span className={`text-sm ${
                  status.connected 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {status.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {status.connected 
                  ? `${status.provider === 'google' ? 'Email & calendar integration active' : 'Office 365 integration active'}`
                  : 'Click to connect your account'
                }
              </p>
              {status.connected && status.lastRefresh && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last refresh: {status.lastRefresh}
                </p>
              )}
              <div className="mt-3">
                {status.connected ? (
                  <button
                    onClick={() => handleDisconnect(status.provider)}
                    className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(status.provider)}
                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">CRM</span>
              <span className="text-blue-600 dark:text-blue-400 text-sm">Ready</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lead management available</p>
          </div>
        </div>
      </div>

      {/* User Information */}
      <div className="card mt-8">
        <h2 className="h2 mb-4">Account Information</h2>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="space-y-2 text-sm">
            <div><strong>User ID:</strong> {session.user?.id}</div>
            <div><strong>Email:</strong> {session.user?.email}</div>
            <div><strong>Name:</strong> {session.user?.name}</div>
            <div><strong>Session Status:</strong> {status}</div>
            <div><strong>Connected Accounts:</strong> {accounts.length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

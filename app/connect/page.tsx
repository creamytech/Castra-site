'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { isFeatureEnabled } from '@/lib/config'

interface Account {
  id: string
  provider: string
  type: string
  access_token?: string
  refresh_token?: string
}

export default function ConnectPage() {
  const { data: session, status } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Castra
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Welcome back, {session.user.name || session.user.email}!
          </p>

          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">User Information</h2>
            <div className="text-left space-y-2 text-sm text-gray-300">
              <p><strong>Name:</strong> {session.user.name || 'Not provided'}</p>
              <p><strong>Email:</strong> {session.user.email || 'Not provided'}</p>
              <p><strong>User ID:</strong> {session.user.id}</p>
              {session.user.oktaId && (
                <p><strong>Okta ID:</strong> {session.user.oktaId}</p>
              )}
              {session.user.groups && session.user.groups.length > 0 && (
                <p><strong>Groups:</strong> {session.user.groups.join(', ')}</p>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Connect Your Accounts</h2>
            <div className="space-y-4">
              {isFeatureEnabled('gmail') ? (
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">G</span>
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
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg opacity-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">G</span>
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
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">O</span>
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
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg opacity-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">O</span>
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

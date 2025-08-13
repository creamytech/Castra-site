'use client'

import { useSession, signIn } from 'next-auth/react'
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
  needsReconnect?: boolean
  reason?: string
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
      const response = await fetch('/api/accounts', { cache: 'no-store' })
      const googleStatusRes = await fetch('/api/integrations/google/status', { cache: 'no-store' })
      const data = response.ok ? await response.json() : { accounts: [] }
      const googleStatus = googleStatusRes.ok ? await googleStatusRes.json() : { connected: false }
      setAccounts(data.accounts || [])

      // Only treat as connected if refresh token exists (status.connected === true)
      const googleConnected = !!googleStatus.connected
      if (googleConnected) {
        router.push('/dashboard')
        return
      }

      // Process connection status using verified Google connection
      const statuses: ConnectionStatus[] = [
        {
          provider: 'google',
          connected: googleConnected,
          lastRefresh: undefined,
          accessToken: undefined,
          refreshToken: googleConnected ? 'Present' : undefined,
          needsReconnect: !googleConnected || googleStatus?.reason === 'no-refresh-token' || googleStatus?.reason === 'invalid_tokens',
          reason: googleStatus?.reason
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
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (provider: string) => {
    // Redirect to sign-in with specific provider (use absolute callback and correct path)
    const callbackUrl = `${window.location.origin}/dashboard/connect`
    // Force prompt consent to ensure refresh token and scopes
    if (provider === 'google') {
      await signIn('google', { callbackUrl, prompt: 'consent', access_type: 'offline' } as any)
    } else {
      await signIn(provider, { callbackUrl } as any)
    }
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

  const handleReconnectGoogle = async () => {
    try {
      await fetch('/api/integrations/google/reconnect', { method: 'POST' })
    } catch {}
    const callbackUrl = `${window.location.origin}/dashboard/connect`
    await signIn('google', { callbackUrl, prompt: 'consent', access_type: 'offline' } as any)
  }

  const handleImportGoogle = async () => {
    const res = await fetch('/api/integrations/google/import', { method: 'POST' })
    if (!res.ok) return
    await fetchAccounts()
  }

  const isConnected = (provider: string) => {
    return accounts.some(account => account.provider === provider)
  }

  if (status === 'loading' || loading) {
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
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Connect Your Accounts</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          Connect your email and calendar to get started with Castra
        </p>
      </div>

      {/* Integrations Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectionStatus.map((status) => (
            <div key={status.provider} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
              {status.reason && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{status.reason}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
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
                {status.provider === 'google' && (
                  <button
                    onClick={handleReconnectGoogle}
                    className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
                    title="Fix tokens by re-consenting with Google"
                  >
                    Reconnect Google
                  </button>
                )}
                {status.provider === 'google' && (
                  <button
                    onClick={handleImportGoogle}
                    className="px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                    title="Import refresh token from NextAuth Account (fallback)"
                  >
                    Import Token
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

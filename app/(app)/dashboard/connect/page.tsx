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
}

export default function ConnectPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      setLoading(false)
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleConnect = (provider: string) => {
    // This would trigger the OAuth flow
    console.log(`Connecting to ${provider}...`)
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
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Gmail</span>
              <span className="text-green-600 dark:text-green-400 text-sm">Connected</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Email integration active</p>
          </div>

          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Google Calendar</span>
              <span className="text-green-600 dark:text-green-400 text-sm">Connected</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Calendar sync enabled</p>
          </div>

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
          </div>
        </div>
      </div>
    </div>
  )
}

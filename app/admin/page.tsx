'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="h1">Admin Dashboard</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            System administration and monitoring
          </p>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="h2 mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-medium text-green-800 dark:text-green-200">Authentication</h3>
                <p className="text-sm text-green-600 dark:text-green-300">✅ Active</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-800 dark:text-blue-200">Database</h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">✅ Connected</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="font-medium text-purple-800 dark:text-purple-200">AI Services</h3>
                <p className="text-sm text-purple-600 dark:text-purple-300">✅ Available</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200">API Limits</h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">⚠️ Monitor</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="h2 mb-4">User Information</h2>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="space-y-2 text-sm">
                <div><strong>User ID:</strong> {session.user?.id}</div>
                <div><strong>Email:</strong> {session.user?.email}</div>
                <div><strong>Name:</strong> {session.user?.name}</div>
                <div><strong>Session Status:</strong> {status}</div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="h2 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                <h3 className="font-medium">View Logs</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">System and error logs</p>
              </button>
              <button className="p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                <h3 className="font-medium">User Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage user accounts</p>
              </button>
              <button className="p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                <h3 className="font-medium">API Settings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure integrations</p>
              </button>
              <button className="p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                <h3 className="font-medium">Backup & Restore</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Data management</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

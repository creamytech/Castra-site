'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'

export const dynamic = 'force-dynamic'

export default function TestGooglePage() {
  const [session, setSession] = useState<any>(null)
  const [status, setStatus] = useState<string>('loading')
  const [mounted, setMounted] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

  const testGoogleConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/inbox/test')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({ error: 'Network error' })
    } finally {
      setLoading(false)
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="h1">Test Google Integration</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Test your Google account connection and API access
          </p>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="h2 mb-4">Connection Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="font-medium">Authentication Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  status === 'authenticated' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                }`}>
                  {status}
                </span>
              </div>
              
              {session && (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-medium mb-2">Session Details:</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>User ID:</strong> {session.user?.id}</div>
                    <div><strong>Email:</strong> {session.user?.email}</div>
                    <div><strong>Name:</strong> {session.user?.name}</div>
                    <div><strong>Has Access Token:</strong> {(session as any).accessToken ? 'Yes' : 'No'}</div>
                    <div><strong>Has Refresh Token:</strong> {(session as any).refreshToken ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="h2 mb-4">API Test</h2>
            <button
              onClick={testGoogleConnection}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Testing...' : 'Test Gmail API Access'}
            </button>
          </div>

          {testResults && (
            <div className="mb-6">
              <h2 className="h2 mb-4">Test Results</h2>
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div>
            <h2 className="h2 mb-4">Troubleshooting</h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <strong>If authentication fails:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Make sure you're signed in with Google</li>
                  <li>Check that you've granted the necessary permissions</li>
                  <li>Try signing out and back in</li>
                </ul>
              </div>
              
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <strong>If API test fails:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Check that Gmail API is enabled in your Google account</li>
                  <li>Verify that Calendar API is enabled</li>
                  <li>Ensure your Google account has the necessary permissions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

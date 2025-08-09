'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

export const dynamic = 'force-dynamic'

export default function DebugAuthPage() {
  const { data: session, status } = useSession()
  const [debugInfo, setDebugInfo] = useState<string>('')

  const testGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/debug-auth' })
  }

  const checkSession = () => {
    setDebugInfo(JSON.stringify({
      status,
      session: session ? {
        user: session.user,
        hasAccessToken: !!(session as any).accessToken,
        hasRefreshToken: !!(session as any).refreshToken,
        expiresAt: (session as any).expiresAt
      } : null
    }, null, 2))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Auth Debug Page
            </h1>
            <p className="text-xl text-gray-300">
              Debug authentication flow and session state
            </p>
          </div>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Auth Debug Page
          </h1>
          <p className="text-xl text-gray-300">
            Debug authentication flow and session state
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-6">
            {/* Status */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Authentication Status</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-white">
                  <strong>Status:</strong> {status}
                </p>
                <p className="text-white">
                  <strong>Authenticated:</strong> {status === 'authenticated' ? 'Yes' : 'No'}
                </p>
                {session && (
                  <p className="text-white">
                    <strong>User ID:</strong> {session.user?.id}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Test Actions</h3>
              <div className="flex space-x-4">
                <button
                  onClick={testGoogleSignIn}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Test Google Sign In
                </button>
                
                <button
                  onClick={checkSession}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                >
                  Check Session
                </button>
                
                <button
                  onClick={() => signOut({ callbackUrl: '/debug-auth' })}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Debug Info */}
            {debugInfo && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {debugInfo}
                  </pre>
                </div>
              </div>
            )}

            {/* Session Details */}
            {session && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Session Details</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <pre className="text-sm text-gray-300 overflow-auto">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

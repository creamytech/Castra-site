'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function SignInPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        window.location.href = '/connect'
      } else {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Castra</h1>
          <p className="text-gray-400">AI-Powered Realtor Co-Pilot</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Sign In</h2>
          
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => signIn('google', { callbackUrl: '/connect' })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Sign in with Google
            </button>
            
            <button
              onClick={() => signIn('azure-ad', { callbackUrl: '/connect' })}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Sign in with Microsoft
            </button>

            <button
              onClick={() => signIn('credentials', { 
                email: 'demo@castra.com', 
                password: 'demo123',
                callbackUrl: '/connect' 
              })}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Demo Sign In
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Demo mode: Use any email/password or click Demo Sign In to explore Castra
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

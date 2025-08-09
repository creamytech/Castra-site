'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function TestGooglePage() {
  const { data: session } = useSession()
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testGoogleConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      
      const googleAccount = data.accounts?.find((acc: any) => acc.provider === 'google')
      
      if (googleAccount) {
        setTestResult(`✅ Google connected!
Provider: ${googleAccount.provider}
Has Access Token: ${!!googleAccount.access_token}
Has Refresh Token: ${!!googleAccount.refresh_token}
Token Type: ${googleAccount.type}`)
      } else {
        setTestResult('❌ No Google account found in database')
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testGmailAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/inbox/test')
      const data = await response.json()
      setTestResult(`✅ Gmail API Test: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setTestResult(`❌ Gmail API Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Please sign in first</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Google OAuth Test
          </h1>
          <p className="text-xl text-gray-300">
            Test Google integration and token storage
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-6">
            {/* Session Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Session Information</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-300 overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>

            {/* Test Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Test Actions</h3>
              
              <div className="flex space-x-4">
                <button
                  onClick={testGoogleConnection}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                >
                  {loading ? 'Testing...' : 'Test Google Connection'}
                </button>
                
                <button
                  onClick={testGmailAPI}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                >
                  {loading ? 'Testing...' : 'Test Gmail API'}
                </button>
              </div>
            </div>

            {/* Test Results */}
            {testResult && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Test Results</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {testResult}
                  </pre>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="pt-6 border-t border-gray-700">
              <Link 
                href="/connect"
                className="inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <span>←</span>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

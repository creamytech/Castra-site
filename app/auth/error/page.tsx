'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'Authentication is not properly configured. Please check your environment variables.'
      case 'AccessDenied':
        return 'Access denied. You may not have permission to access this application.'
      case 'Verification':
        return 'Email verification failed. Please try again.'
      default:
        return 'An authentication error occurred. Please try again.'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Castra</h1>
          <p className="text-gray-400">AI-Powered Realtor Co-Pilot</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900 mb-4">
              <svg className="h-6 w-6 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-4">Authentication Error</h2>
            
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
              {getErrorMessage(error)}
            </div>

            <div className="space-y-4">
              <Link
                href="/auth/signin"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors inline-block"
              >
                Try Again
              </Link>
              
              <Link
                href="/"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors inline-block"
              >
                Go Home
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                If this problem persists, please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function AuthErrorContent() {
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
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with a different account. Please sign in with the original provider or use a different email address.'
      default:
        return 'An authentication error occurred. Please try again.'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white dark:text-white text-gray-800 mb-2">Castra</h1>
          <p className="text-gray-400 dark:text-gray-400 text-gray-600">AI-Powered Realtor Co-Pilot</p>
        </div>

        <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-6 shadow-lg">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900 mb-4">
              <svg className="h-6 w-6 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-white dark:text-white text-gray-800 mb-4">Authentication Error</h2>
            
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 dark:text-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm">
              {getErrorMessage(error)}
            </div>

            <div className="space-y-4">
              <Link
                href="/auth/signin"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
              >
                Try Again
              </Link>
              
              <Link
                href="/"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
              >
                Go Home
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400 dark:text-gray-400 text-gray-600 text-sm">
                If this problem persists, please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-white dark:text-white text-gray-800">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}

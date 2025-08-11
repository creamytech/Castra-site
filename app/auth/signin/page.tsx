'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'

export default function SignInPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        window.location.href = '/dashboard'
      } else {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  const handleGoogleSignIn = () => {
    console.log('Google sign-in clicked')
    setLoading(true)
    // Use default redirect behavior; pass redirect:false to capture provider errors
    signIn('google', { callbackUrl: '/dashboard', redirect: false }).then((result) => {
      console.log('Google sign-in result:', result)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    }).catch((error) => {
      console.error('Google sign-in error:', error)
      setError('Google sign-in failed')
      setLoading(false)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ThemeToggle />
      
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900 bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20 from-blue-400/30 via-purple-400/30 to-pink-400/30 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/30 dark:bg-blue-500/30 bg-blue-400/40 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/30 dark:bg-purple-500/30 bg-purple-400/40 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500/30 dark:bg-pink-500/30 bg-pink-400/40 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-yellow-500/30 dark:bg-yellow-500/30 bg-yellow-400/40 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-6000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <span className="text-3xl">🏠</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Castra
            </h1>
            <p className="text-xl text-gray-200 font-light">AI-Powered Realtor Co-Pilot</p>
            <p className="text-gray-400 text-sm mt-2">Transform your real estate business with AI</p>
          </div>

          {/* Sign In Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">Welcome Back</h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>

              <div className="text-center">
                <p className="text-gray-300 text-sm">
                  By signing in, you agree to our{' '}
                  <a href="/terms" className="text-blue-300 hover:text-blue-200 underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-blue-300 hover:text-blue-200 underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              Need help?{' '}
              <a href="/contact" className="text-blue-300 hover:text-blue-200 underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

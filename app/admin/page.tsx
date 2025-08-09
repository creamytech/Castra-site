'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isAdmin } from '@/lib/rbac'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || !isAdmin(session)) {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!session || !isAdmin(session)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-red-400">403 Forbidden</h1>
          <p className="text-gray-300">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required groups: admin, Admin, or ADMIN
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Castra Admin
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Administrative dashboard
          </p>
          
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Welcome, Admin!</h2>
            <p className="text-gray-300 mb-4">
              You have administrative access to Castra.
            </p>
            <div className="text-sm text-gray-400">
              <p>User ID: {session.user.id}</p>
              <p>Groups: {session.user.groups?.join(', ') || 'None'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  useEffect(() => {
    if (status === 'authenticated') {
      window.location.href = '/onboarding'
    }
  }, [status])
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="w-full max-w-sm mx-auto border rounded-xl p-6 bg-card shadow-lg">
        <div className="text-center space-y-2 mb-6">
          <div className="text-2xl font-semibold">Castra</div>
          <div className="text-sm text-muted-foreground">Castra connects to your Gmail & Calendar to draft replies, schedule showings, and keep you organized—automatically.</div>
        </div>
        <div className="space-y-3">
          <button onClick={() => signIn('google', { callbackUrl: '/onboarding' })} className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition">Continue with Google</button>
          <button onClick={() => signIn('email', { callbackUrl: '/onboarding' })} className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md border bg-background hover:bg-muted transition">Continue with Email</button>
        </div>
        <div className="text-[11px] text-muted-foreground mt-4">
          We only request read access for inbox + calendar and send drafts you approve. You can disconnect anytime.
        </div>
      </div>
    </div>
  )
}



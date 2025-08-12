"use client"

import { useEffect, useState } from 'react'

type Account = { id: string; provider: string; expires_at?: number | null; access_token?: string | null; refresh_token?: string | null }

export default function ProfileSettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'classic'|'sunset'|'ocean'|'forest'|'lux'>('classic')

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/accounts', { cache: 'no-store' })
        const j = await r.json()
        if (r.ok) setAccounts(j.accounts || [])
        else setError(j?.error || 'Failed to load accounts')
      } catch (e: any) {
        setError(e?.message || 'Failed to load accounts')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isConnected = (provider: string) => accounts.some(a => a.provider === provider)
  const expiresAt = (provider: string) => {
    const a = accounts.find(x => x.provider === provider)
    return a?.expires_at ? new Date(a.expires_at * 1000).toLocaleString() : '—'
  }

  const connectGoogle = () => {
    window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent('/dashboard')}`
  }
  const connectInstagram = () => {
    window.location.href = `/api/instagram/start`
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="h1">Profile & Connections</h1>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-card space-y-3 hover-shimmer">
          <div className="font-semibold">Google</div>
          <div className="text-sm">Status: {isConnected('google') ? <span className="badge" data-status="follow_up">Connected</span> : 'Not connected'}</div>
          <div className="text-xs text-muted-foreground">Expires: {expiresAt('google')}</div>
          {!isConnected('google') && <button className="px-3 py-1.5 border rounded text-sm" onClick={connectGoogle}>Connect Google</button>}
        </div>

        <div className="p-4 border rounded bg-card space-y-3 hover-shimmer">
          <div className="font-semibold">Instagram</div>
          <div className="text-sm">Status: <span className="badge" data-status="no_lead">Not connected</span></div>
          <div className="text-xs text-muted-foreground">Requires IG App credentials (see env). Scopes: instagram_basic, instagram_manage_messages.</div>
          <button className="px-3 py-1.5 border rounded text-sm" onClick={connectInstagram}>Connect Instagram</button>
        </div>
      </div>

      <div className="p-4 border rounded bg-card space-y-2">
        <div className="font-semibold">Agent Profile</div>
        <div className="text-sm text-muted-foreground">Coming soon: edit display name, phone, signature, and AI voice/style.</div>
      </div>

      <div className="p-4 border rounded bg-card space-y-3">
        <div className="font-semibold">Theme</div>
        <div className="text-sm text-muted-foreground">Choose a visual theme for your dashboard.</div>
        <div className="flex flex-wrap gap-2">
          {(['classic','sunset','ocean','forest','lux'] as const).map((t)=> (
            <button key={t} onClick={()=>{
              setTheme(t)
              if (typeof document !== 'undefined') {
                const root = document.documentElement
                root.setAttribute('data-theme', t)
              }
            }} className={`px-3 py-1.5 border rounded-full text-sm ${theme===t?'bg-accent text-accent-foreground':'hover:bg-muted/60'}`}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  )
}



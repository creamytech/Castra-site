'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/http'

export default function MlsPage() {
  const [q, setQ] = useState('{ "city": "Miami" }')
  const [results, setResults] = useState<any>(null)
  const search = async () => {
    const res = await apiFetch('/api/mls/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: q })
    setResults(await res.json())
  }
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">MLS</h1>
      <textarea className="w-full h-24 border rounded p-2" value={q} onChange={e=>setQ(e.target.value)} />
      <button onClick={search} className="px-4 py-2 bg-primary text-primary-foreground rounded">Search Listings</button>
      <pre className="whitespace-pre-wrap text-sm">{results ? JSON.stringify(results, null, 2) : 'No results'}</pre>
    </div>
  )
}



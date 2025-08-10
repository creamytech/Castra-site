"use client"

import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r=>r.json())

export default function ContactsPage() {
  const [q, setQ] = useState('')
  const { data, mutate, isLoading } = useSWR(`/api/contacts?q=${encodeURIComponent(q)}`, fetcher, { refreshInterval: 60000 })
  const contacts = data?.contacts || []
  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search contacts" className="border rounded px-2 py-1 bg-background" />
        <Link href="/crm/contacts/new" className="text-xs px-2 py-1 rounded border">+ New Contact</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contacts.map((c:any)=>(
          <Link key={c.id} href={`/crm/contacts/${c.id}`} className="p-3 border rounded bg-card hover:bg-muted/50">
            <div className="font-medium">{c.firstName} {c.lastName}</div>
            <div className="text-xs text-muted-foreground">{c.email || c.phone || 'No contact info'}</div>
          </Link>
        ))}
        {contacts.length===0 && !isLoading && <div className="text-sm text-muted-foreground">No contacts</div>}
      </div>
    </div>
  )
}



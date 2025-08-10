"use client"

import useSWR from 'swr'
import { useParams } from 'next/navigation'

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r=>r.json())

export default function ContactProfilePage() {
  const params = useParams()
  const id = String(params?.id || '')
  const { data } = useSWR(id ? `/api/contacts/${id}` : null, fetcher)
  const contact = data?.contact
  if (!contact) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  return (
    <div className="p-6 space-y-4">
      <div className="p-4 border rounded bg-card">
        <div className="text-xl font-bold">{contact.firstName} {contact.lastName}</div>
        <div className="text-sm text-muted-foreground">{contact.email} {contact.phone ? `• ${contact.phone}` : ''}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-card">
          <div className="font-semibold mb-2 text-sm">Deals</div>
          {(contact.deals||[]).map((d:any)=>(
            <a key={d.id} href={`/crm/deals/${d.id}`} className="block text-sm hover:underline">{d.title} — {d.stage}</a>
          ))}
        </div>
        <div className="p-4 border rounded bg-card">
          <div className="font-semibold mb-2 text-sm">Actions</div>
          <div className="flex gap-2">
            <a href={`/crm/deals/new?contactId=${contact.id}`} className="text-xs px-2 py-1 rounded border">Create Deal</a>
            <a href={`/dashboard/inbox`} className="text-xs px-2 py-1 rounded border">Send Email</a>
          </div>
        </div>
      </div>
    </div>
  )
}



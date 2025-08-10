'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  const load = async () => {
    try {
      const res = await fetch('/api/notifications?unread=true', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setItems(data.notifications || [])
        setUnread(data.unreadCount || 0)
      }
    } catch {}
  }

  const markAll = async () => {
    try {
      const ids = items.map(i => i.id)
      if (ids.length === 0) return
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
      setItems([])
      setUnread(0)
    } catch {}
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-2 rounded hover:bg-muted/80" aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 text-[10px] bg-red-600 text-white rounded-full px-1">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="text-sm font-medium">Notifications</div>
            <button onClick={markAll} className="text-xs text-primary hover:underline">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No new notifications</div>
            ) : items.map(item => (
              <a key={item.id} href={item.link || '#'} className="block px-3 py-2 hover:bg-muted/50">
                <div className="text-sm font-medium">{item.title}</div>
                {item.body && <div className="text-xs text-muted-foreground line-clamp-2">{item.body}</div>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

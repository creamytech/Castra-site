"use client"

import { useState } from 'react'
const cn = (...cls: Array<string | false | null | undefined>) => cls.filter(Boolean).join(' ')
import { Inbox, Star, Send, FileText, Ban, Trash2, Mail, ChevronDown } from 'lucide-react'

type FolderKey = 'inbox'|'unread'|'starred'|'drafts'|'spam'|'trash'|'archived'|'all'
type CategoryKey = 'primary'|'promotions'|'social'|'updates'|'forums'|'all'

export default function SidebarNav({
  folder,
  onChangeFolder,
  onCompose,
  syncing,
  onSync,
  counts,
}: {
  folder: FolderKey
  onChangeFolder: (f: FolderKey) => void
  onCompose?: () => void
  syncing?: boolean
  onSync?: () => void
  counts?: Partial<Record<FolderKey, number>>
}) {
  const [dragKey, setDragKey] = useState<FolderKey | null>(null)
  const FOLDERS: { key: FolderKey; label: string; icon: any }[] = [
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'unread', label: 'Unread', icon: Mail },
    { key: 'starred', label: 'Starred', icon: Star },
    { key: 'drafts', label: 'Drafts', icon: FileText },
    { key: 'spam', label: 'Spam', icon: Ban },
    { key: 'trash', label: 'Trash', icon: Trash2 },
    { key: 'archived', label: 'Archived', icon: Inbox },
    { key: 'all', label: 'All Mail', icon: Send },
  ]

  // Categories removed per new design; default logic handled client-side

  return (
    <aside className="space-y-3 animate-slide-in">
      <div className="flex items-center gap-2">
        <button
          onClick={onCompose}
          className="px-3 py-2 rounded-full bg-primary text-primary-foreground shadow hover:shadow-md transition-shadow duration-200"
        >
          Compose
        </button>
        <button
          onClick={onSync}
          className="ml-auto text-xs px-2 py-1 rounded border flex items-center gap-2"
          aria-label="Sync"
        >
          {syncing && <span className="inline-block w-3 h-3 border-2 border-border border-t-transparent rounded-full animate-spin"/>}
          Refresh
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {FOLDERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChangeFolder(key)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors border',
              folder === key ? 'bg-primary/10 text-foreground' : 'hover:bg-accent',
              dragKey === key ? 'border-primary ring-2 ring-primary/40' : 'border-transparent'
            )}
            onDragOver={(e)=>{
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move'
            }}
            onDragEnter={(e)=>{ e.preventDefault(); setDragKey(key) }}
            onDragLeave={(e)=>{ e.preventDefault(); setDragKey((prev)=> prev === key ? null : prev) }}
            onDrop={async (e)=>{
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (data?.type === 'thread' && data?.id) {
                  // Map drop target to bulk action
                  const id = data.id as string
                  if (key === 'trash') await fetch('/api/inbox/threads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], action: 'trash' }) })
                  if (key === 'spam') await fetch('/api/inbox/threads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], action: 'spam' }) })
                  if (key === 'archived') await fetch('/api/inbox/threads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], action: 'archive' }) })
                  if (key === 'starred') await fetch('/api/inbox/threads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], action: 'star' }) })
                  window.dispatchEvent(new Event('inbox-refresh'))
                }
              } catch {}
              setDragKey(null)
            }}
          >
            <Icon size={16} className={cn('shrink-0', folder === key ? 'text-primary' : 'text-muted-foreground')} />
            <span className="flex-1 text-left truncate">{label}</span>
            {typeof counts?.[key] === 'number' && counts?.[key]! > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{counts?.[key]}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Categories removed */}
    </aside>
  )
}



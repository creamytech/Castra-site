"use client"

const cn = (...cls: Array<string | false | null | undefined>) => cls.filter(Boolean).join(' ')
import { Inbox, Star, Send, FileText, Ban, Trash2, Mail, ChevronDown } from 'lucide-react'

type FolderKey = 'inbox'|'unread'|'starred'|'drafts'|'spam'|'trash'|'all'
type CategoryKey = 'primary'|'promotions'|'social'|'updates'|'forums'|'all'

export default function SidebarNav({
  folder,
  onChangeFolder,
  category,
  onChangeCategory,
  onCompose,
  syncing,
  onSync,
  counts,
}: {
  folder: FolderKey
  onChangeFolder: (f: FolderKey) => void
  category: CategoryKey
  onChangeCategory: (c: CategoryKey) => void
  onCompose?: () => void
  syncing?: boolean
  onSync?: () => void
  counts?: Partial<Record<FolderKey, number>>
}) {
  const FOLDERS: { key: FolderKey; label: string; icon: any }[] = [
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'unread', label: 'Unread', icon: Mail },
    { key: 'starred', label: 'Starred', icon: Star },
    { key: 'drafts', label: 'Drafts', icon: FileText },
    { key: 'spam', label: 'Spam', icon: Ban },
    { key: 'trash', label: 'Trash', icon: Trash2 },
    { key: 'all', label: 'All Mail', icon: Send },
  ]

  const CATS: { key: CategoryKey; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'promotions', label: 'Promotions' },
    { key: 'social', label: 'Social' },
    { key: 'updates', label: 'Updates' },
    { key: 'forums', label: 'Forums' },
    { key: 'all', label: 'All' },
  ]

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
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              folder === key ? 'bg-primary/10 text-foreground' : 'hover:bg-accent'
            )}
          >
            <Icon size={16} className={cn('shrink-0', folder === key ? 'text-primary' : 'text-muted-foreground')} />
            <span className="flex-1 text-left truncate">{label}</span>
            {typeof counts?.[key] === 'number' && counts?.[key]! > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{counts?.[key]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="pt-2">
        <div className="text-xs text-muted-foreground mb-1">Categories</div>
        <details className="relative">
          <summary className="list-none px-3 py-2 rounded-md border flex items-center justify-between cursor-pointer hover:bg-accent/50">
            <span className="text-sm">{CATS.find(c=>c.key===category)?.label || 'Primary'}</span>
            <ChevronDown size={14} className="opacity-70" />
          </summary>
          <div className="absolute z-20 mt-2 w-full bg-popover border rounded-md shadow-lg overflow-hidden">
            {CATS.map((c) => (
              <button
                key={c.key}
                onClick={() => onChangeCategory(c.key)}
                className={cn('w-full text-left px-3 py-2 text-sm hover:bg-accent', category === c.key ? 'bg-primary/10' : '')}
              >
                {c.label}
              </button>
            ))}
          </div>
        </details>
      </div>
    </aside>
  )
}



"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, Mail, Inbox, Star, Eye, EyeOff, Trash2, Bug, FileText } from 'lucide-react'

interface Message {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  internalDate: string
  labels: string[]
  autoTags?: string[]
}

interface Counts {
  inbox: number
  unread: number
  read: number
  spam: number
  drafts: number
  trash: number
}

const FOLDERS = [
  { key: 'INBOX', label: 'Inbox', icon: Inbox },
  { key: 'UNREAD', label: 'Unread', icon: EyeOff },
  { key: 'READ', label: 'Read', icon: Eye },
  { key: 'STARRED', label: 'Starred', icon: Star },
  { key: 'DRAFTS', label: 'Drafts', icon: FileText },
  { key: 'SPAM', label: 'Spam', icon: Bug },
  { key: 'TRASH', label: 'Deleted', icon: Trash2 },
]

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [folder, setFolder] = useState('INBOX')
  const [didAutoSync, setDidAutoSync] = useState(false)
  const router = useRouter()

  const fetchMessages = async (label = folder, query = '') => {
    try {
      const response = await fetch(`/api/gmail/sync?label=${label}&q=${encodeURIComponent(query)}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setCounts(data.counts || null)
        return (data.messages || []).length as number
      }
      return 0
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      return 0
    } finally {
      setLoading(false)
    }
  }

  const syncMessages = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/gmail/sync', { method: 'POST' })
      if (response.ok) {
        await fetchMessages(folder, searchQuery)
      }
    } catch (error) {
      console.error('Failed to sync messages:', error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const count = await fetchMessages('INBOX')
      if (mounted && count === 0 && !didAutoSync) {
        setDidAutoSync(true)
        await syncMessages()
      }
    })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchMessages(folder, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder])

  const handleSearch = () => {
    setLoading(true)
    fetchMessages(folder, searchQuery)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const handleMessageClick = (messageId: string) => {
    router.push(`/dashboard/inbox/${messageId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6 max-w-6xl">
      {/* Sidebar */}
      <aside className="md:col-span-1">
        <div className="bg-card border border-border rounded-lg">
          <ul className="p-2">
            {FOLDERS.map(f => {
              const Icon = f.icon
              const active = folder === f.key
              const count = counts ? (f.key === 'INBOX' ? counts.inbox :
                                       f.key === 'UNREAD' ? counts.unread :
                                       f.key === 'READ' ? counts.read :
                                       f.key === 'SPAM' ? counts.spam :
                                       f.key === 'DRAFTS' ? counts.drafts :
                                       f.key === 'TRASH' ? counts.trash : 0) : 0
              return (
                <li key={f.key}>
                  <button
                    onClick={() => setFolder(f.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} transition-colors`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {f.label}
                    </span>
                    <span className={`text-xs ${active ? 'opacity-90' : 'text-muted-foreground'}`}>{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      {/* Message List */}
      <section className="md:col-span-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{FOLDERS.find(f => f.key === folder)?.label}</h1>
          <button
            onClick={syncMessages}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search in ${FOLDERS.find(f => f.key === folder)?.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>

        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages found</p>
              <button onClick={syncMessages} className="mt-2 text-primary hover:underline">Sync your inbox</button>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                onClick={() => handleMessageClick(message.id)}
                className="p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground truncate">
                        {message.from}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(message.internalDate)}
                      </span>
                    </div>
                    <h3 className="font-medium text-foreground mb-1 truncate">
                      {message.subject || '(No subject)'}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.snippet}
                    </p>
                    {message.autoTags && message.autoTags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {message.autoTags.map(tag => (
                          <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

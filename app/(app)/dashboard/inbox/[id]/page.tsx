'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, User, RefreshCw, Send } from 'lucide-react'

interface Message {
  id: string
  gmailId: string
  threadId: string
  from: string
  subject: string
  snippet: string
  internalDate: string
  labels: string[]
}

export default function MessageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [message, setMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftTo, setDraftTo] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [draftPreview, setDraftPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch(`/api/gmail/sync?q=id:${params.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.messages && data.messages.length > 0) {
            setMessage(data.messages[0])
            // Set defaults for draft
            const fromEmail = data.messages[0].from?.match(/<([^>]+)>/)?.[1] || data.messages[0].from
            setDraftTo(fromEmail || '')
            setDraftSubject(`Re: ${data.messages[0].subject || ''}`.trim())
          } else {
            setError("Message not found. It may have been unsynced. Try syncing your inbox.")
          }
        } else {
          setError("Failed to fetch message")
        }
      } catch (error) {
        console.error('Failed to fetch message:', error)
        setError("Failed to load message")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchMessage()
    }
  }, [params.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/gmail/sync', { method: 'POST' })
      if (response.ok) {
        const messageResponse = await fetch(`/api/gmail/sync?q=id:${params.id}`)
        if (messageResponse.ok) {
          const data = await messageResponse.json()
          if (data.messages && data.messages.length > 0) {
            setMessage(data.messages[0])
          } else {
            setError("Message still not found after sync")
          }
        }
      }
    } catch (error) {
      setError("Failed to sync inbox")
    } finally {
      setLoading(false)
    }
  }

  const createDraft = async () => {
    if (!draftTo || !draftSubject || !draftBody || !message) return
    setDrafting(true)
    setDraftPreview(null)
    try {
      const res = await fetch('/api/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: message.threadId,
          to: draftTo,
          subject: draftSubject,
          content: draftBody
        })
      })
      const data = await res.json()
      if (res.ok) {
        setDraftPreview(data.html)
      } else {
        setError(data.error || 'Failed to create draft')
      }
    } catch (e) {
      setError('Network error creating draft')
    } finally {
      setDrafting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inbox
        </button>

        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">{error}</div>
          <button
            onClick={handleSync}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Inbox
          </button>
        </div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Message not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to inbox
      </button>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">
              {message.subject || '(No subject)'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {message.from}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(message.internalDate)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">
              {message.snippet}
            </p>
          </div>
        </div>

        {message.labels.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {message.labels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Reply Composer */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Draft a reply</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input value={draftTo} onChange={(e)=>setDraftTo(e.target.value)} className="px-3 py-2 bg-input border border-input rounded" placeholder="To" />
          <input value={draftSubject} onChange={(e)=>setDraftSubject(e.target.value)} className="px-3 py-2 bg-input border border-input rounded" placeholder="Subject" />
        </div>
        <textarea value={draftBody} onChange={(e)=>setDraftBody(e.target.value)} className="w-full h-32 px-3 py-2 bg-input border border-input rounded mb-3" placeholder="Write your reply..." />
        <button onClick={createDraft} disabled={drafting || !draftTo || !draftSubject || !draftBody} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
          <Send className="w-4 h-4" />
          {drafting ? 'Drafting...' : 'Create Draft'}
        </button>
        {draftPreview && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: draftPreview }} />
          </div>
        )}
      </div>
    </div>
  )
}

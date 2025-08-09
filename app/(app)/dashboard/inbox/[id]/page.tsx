'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, User } from 'lucide-react'

interface Message {
  id: string
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

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch(`/api/gmail/sync?q=id:${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setMessage(data.messages?.[0] || null)
        }
      } catch (error) {
        console.error('Failed to fetch message:', error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
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
    </div>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import Toast from '@/components/Toast'

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function InboxPage() {
  const { data: session, status } = useSession()
  const [threadId, setThreadId] = useState('')
  const [summary, setSummary] = useState('')
  const [draftHtml, setDraftHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const handleSummarize = async () => {
    if (!threadId.trim()) {
      addToast('Please enter a thread ID')
      return
    }

    setLoading(true)
    setSummary('')
    setDraftHtml('')

    try {
      const response = await fetch('/api/email/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threadId }),
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
        if (data.cached) {
          addToast('Summary loaded from cache', 'info')
        } else {
          addToast('Summary generated successfully', 'success')
        }
      } else {
        const errorData = await response.json()
        addToast(errorData.error || 'Failed to summarize thread')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDraft = async () => {
    if (!summary) {
      addToast('Please generate a summary first')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/email/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadSummary: summary,
          lastMessage: 'Sample last message',
          to: 'recipient@example.com',
          subject: 'Follow-up',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDraftHtml(data.html)
        addToast('Draft created successfully', 'success')
      } else {
        const errorData = await response.json()
        addToast(errorData.error || 'Failed to create draft')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Not authenticated</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Castra Inbox
          </h1>
          <p className="text-xl text-gray-300">
            AI-powered email assistant
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">
              Gmail Thread ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={threadId}
                onChange={(e) => setThreadId(e.target.value)}
                placeholder="Enter Gmail thread ID"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSummarize}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {loading ? 'Processing...' : 'Summarize'}
              </button>
            </div>
          </div>

          {summary && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Thread Summary</h3>
              <div className="p-4 bg-gray-700 rounded-lg text-gray-200 whitespace-pre-line">
                {summary}
              </div>
              <button
                onClick={handleCreateDraft}
                disabled={loading}
                className="mt-3 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {loading ? 'Creating...' : 'Create Draft'}
              </button>
            </div>
          )}

          {draftHtml && (
            <div>
              <h3 className="text-white font-semibold mb-2">Draft Preview</h3>
              <div className="p-4 bg-gray-700 rounded-lg text-gray-200">
                <div dangerouslySetInnerHTML={{ __html: draftHtml }} />
              </div>
              <p className="mt-2 text-green-400 text-sm">
                ✓ Draft created in Gmail
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Toast from '@/components/Toast'
import ThemeToggle from '@/components/ThemeToggle'

interface Email {
  id: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  date: string
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function InboxPage() {
  const { data: session, status } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [summary, setSummary] = useState('')
  const [draftHtml, setDraftHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const fetchEmails = async () => {
    setLoadingEmails(true)
    try {
      const response = await fetch('/api/inbox?maxResults=10')
      if (response.ok) {
        const data = await response.json()
        setEmails(data.threads || [])
      } else {
        addToast('Failed to fetch emails')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoadingEmails(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEmails()
    }
  }, [status])

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email)
    setSummary('')
    setDraftHtml('')
    setLoading(true)

    try {
      const response = await fetch('/api/email/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threadId: email.threadId }),
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
    if (!summary || !selectedEmail) {
      addToast('Please select an email and generate a summary first')
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
          lastMessage: selectedEmail.snippet,
          to: selectedEmail.sender,
          subject: `Re: ${selectedEmail.subject}`,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-gray-800 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-gray-800 dark:text-white">Not authenticated</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ThemeToggle />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Castra Inbox</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            AI-powered email assistant
          </p>
        </div>

        {/* Back to Dashboard */}
        <div className="mb-6">
          <Link
            href="/connect"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Emails</h2>
                <button
                  onClick={fetchEmails}
                  disabled={loadingEmails}
                  className="btn-secondary text-sm py-2 px-3"
                >
                  {loadingEmails ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleEmailSelect(email)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEmail?.id === email.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
                    }`}
                  >
                    <div className="font-medium truncate">{email.subject}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {email.sender}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {formatDate(email.date)}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                      {email.snippet}
                    </div>
                  </button>
                ))}
                
                {emails.length === 0 && !loadingEmails && (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    <p>No emails found</p>
                    <p className="text-sm">Connect your Gmail account to see emails here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Details and Actions */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <div className="space-y-6">
                {/* Email Summary */}
                <div className="card">
                  <h3 className="mb-4">Email Summary</h3>
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="text-gray-600 dark:text-gray-400">Generating summary...</span>
                    </div>
                  ) : summary ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 whitespace-pre-line">
                        {summary}
                      </div>
                      <button
                        onClick={handleCreateDraft}
                        disabled={loading}
                        className="btn-primary"
                      >
                        {loading ? 'Creating...' : 'Create Reply Draft'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                      <p>Click on an email to generate an AI summary</p>
                    </div>
                  )}
                </div>

                {/* Draft Preview */}
                {draftHtml && (
                  <div className="card">
                    <h3 className="mb-4">Draft Preview</h3>
                    <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">
                      <div dangerouslySetInnerHTML={{ __html: draftHtml }} />
                    </div>
                    <div className="mt-3 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 text-sm">
                        ✓ Draft created in Gmail
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="mb-2">Select an Email</h3>
                  <p>Choose an email from the list to view its AI summary and create reply drafts</p>
                </div>
              </div>
            )}
          </div>
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

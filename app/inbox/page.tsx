'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import Toast from '@/components/Toast'

interface Email {
  id: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  date: string
  labels?: string[]
  isRead?: boolean
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function InboxPage() {
  const { data: session, status } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [summary, setSummary] = useState('')
  const [draftHtml, setDraftHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFilter, setSearchFilter] = useState<'all' | 'sender' | 'subject' | 'content'>('all')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])

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
      const response = await fetch('/api/inbox?maxResults=50')
      if (response.ok) {
        const data = await response.json()
        const emailsWithLabels = (data.threads || []).map((email: any) => ({
          ...email,
          labels: email.labels || [],
          isRead: email.isRead || false
        }))
        setEmails(emailsWithLabels)
        setFilteredEmails(emailsWithLabels)
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

  // Filter emails based on search term and filters
  useEffect(() => {
    let filtered = emails

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(email => {
        switch (searchFilter) {
          case 'sender':
            return email.sender.toLowerCase().includes(term)
          case 'subject':
            return email.subject.toLowerCase().includes(term)
          case 'content':
            return email.snippet.toLowerCase().includes(term)
          default:
            return (
              email.sender.toLowerCase().includes(term) ||
              email.subject.toLowerCase().includes(term) ||
              email.snippet.toLowerCase().includes(term)
            )
        }
      })
    }

    if (selectedLabels.length > 0) {
      filtered = filtered.filter(email => 
        email.labels?.some(label => selectedLabels.includes(label))
      )
    }

    setFilteredEmails(filtered)
  }, [emails, searchTerm, searchFilter, selectedLabels])

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

  const getUniqueLabels = () => {
    const labels = new Set<string>()
    emails.forEach(email => {
      email.labels?.forEach(label => labels.add(label))
    })
    return Array.from(labels)
  }

  if (status === 'loading') {
    return (
      <MainLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Loading...</div>
        </div>
      </MainLayout>
    )
  }

  if (!session) {
    return (
      <MainLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Not authenticated</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Castra Inbox</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            AI-powered email assistant
          </p>
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

              {/* Search and Filters */}
              <div className="mb-4 space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All</option>
                    <option value="sender">Sender</option>
                    <option value="subject">Subject</option>
                    <option value="content">Content</option>
                  </select>
                </div>

                {/* Labels Filter */}
                <div className="flex flex-wrap gap-2">
                  {getUniqueLabels().map(label => (
                    <button
                      key={label}
                      onClick={() => {
                        setSelectedLabels(prev => 
                          prev.includes(label) 
                            ? prev.filter(l => l !== label)
                            : [...prev, label]
                        )
                      }}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        selectedLabels.includes(label)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleEmailSelect(email)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEmail?.id === email.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
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
                      </div>
                      {!email.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                      )}
                    </div>
                    
                    {/* Labels */}
                    {email.labels && email.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {email.labels.slice(0, 3).map(label => (
                          <span
                            key={label}
                            className="px-1 py-0.5 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {label}
                          </span>
                        ))}
                        {email.labels.length > 3 && (
                          <span className="px-1 py-0.5 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                            +{email.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}

                {filteredEmails.length === 0 && !loadingEmails && (
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
    </MainLayout>
  )
}

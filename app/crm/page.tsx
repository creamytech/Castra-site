'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import Toast from '@/components/Toast'

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  source: string
  tags: string[]
  lastContact: string
  emailCount: number
  meetingCount: number
  leadScore: number
  status: 'new' | 'contacted' | 'showing' | 'offer' | 'closed'
  notes?: string
  createdAt: string
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

type PipelineStage = 'new' | 'contacted' | 'showing' | 'offer' | 'closed'

const STAGE_CONFIG = {
  new: { label: 'New Leads', color: 'bg-blue-500', count: 0 },
  contacted: { label: 'Contacted', color: 'bg-yellow-500', count: 0 },
  showing: { label: 'Showing', color: 'bg-purple-500', count: 0 },
  offer: { label: 'Offer', color: 'bg-orange-500', count: 0 },
  closed: { label: 'Closed', color: 'bg-green-500', count: 0 },
}

export default function CRMPage() {
  const { data: session, status } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/crm/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
        setFilteredContacts(data.contacts || [])
      } else {
        addToast('Failed to fetch contacts')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const syncFromEmail = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/crm/sync-email', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        addToast(`Synced ${data.syncedCount} contacts from email`, 'success')
        fetchContacts() // Refresh the list
      } else {
        addToast('Failed to sync from email')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const syncFromCalendar = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/crm/sync-calendar', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        addToast(`Synced ${data.syncedCount} contacts from calendar`, 'success')
        fetchContacts() // Refresh the list
      } else {
        addToast('Failed to sync from calendar')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchContacts()
    }
  }, [status])

  // Filter contacts based on search and filters
  useEffect(() => {
    let filtered = contacts

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term) ||
        contact.phone?.toLowerCase().includes(term) ||
        contact.notes?.toLowerCase().includes(term)
      )
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(contact => 
        contact.tags.some(tag => selectedTags.includes(tag))
      )
    }

    if (selectedSources.length > 0) {
      filtered = filtered.filter(contact => 
        selectedSources.includes(contact.source)
      )
    }

    setFilteredContacts(filtered)
  }, [contacts, searchTerm, selectedTags, selectedSources])

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('contactId', contactId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: PipelineStage) => {
    e.preventDefault()
    const contactId = e.dataTransfer.getData('contactId')
    
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setContacts(prev => prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, status: newStatus }
            : contact
        ))
        addToast('Contact status updated', 'success')
      } else {
        addToast('Failed to update contact status')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    }
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'bg-red-500'
    if (score >= 60) return 'bg-orange-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const getLeadScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot Lead'
    if (score >= 60) return 'Warm Lead'
    if (score >= 40) return 'Cool Lead'
    return 'Cold Lead'
  }

  const getUniqueTags = () => {
    const tags = new Set<string>()
    contacts.forEach(contact => {
      contact.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  }

  const getUniqueSources = () => {
    const sources = new Set<string>()
    contacts.forEach(contact => sources.add(contact.source))
    return Array.from(sources)
  }

  const getContactsByStage = (stage: PipelineStage) => {
    return filteredContacts.filter(contact => contact.status === stage)
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
          <h1 className="mb-4">Castra CRM</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Pipeline management & lead scoring
          </p>
        </div>

        {/* Actions Bar */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                + Add Contact
              </button>
              <button
                onClick={syncFromEmail}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? 'Syncing...' : 'Sync from Email'}
              </button>
              <button
                onClick={syncFromCalendar}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? 'Syncing...' : 'Sync from Calendar'}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 space-y-3">
            {/* Tags Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</span>
              {getUniqueTags().map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    )
                  }}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Sources Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources:</span>
              {getUniqueSources().map(source => (
                <button
                  key={source}
                  onClick={() => {
                    setSelectedSources(prev => 
                      prev.includes(source) 
                        ? prev.filter(s => s !== source)
                        : [...prev, source]
                    )
                  }}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedSources.includes(source)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
            const stageContacts = getContactsByStage(stage as PipelineStage)
            const stageCount = stageContacts.length
            
            return (
              <div
                key={stage}
                className="card"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage as PipelineStage)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {config.label}
                    </h3>
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    {stageCount}
                  </span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stageContacts.map((contact) => (
                    <div
                      key={contact.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact.id)}
                      className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 dark:text-white truncate">
                            {contact.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {contact.email}
                          </div>
                        </div>
                        
                        {/* Lead Score Badge */}
                        <div className={`px-2 py-1 text-xs text-white rounded-full ${getLeadScoreColor(contact.leadScore)}`}>
                          {getLeadScoreLabel(contact.leadScore)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>{contact.source}</span>
                        <span>{new Date(contact.lastContact).toLocaleDateString()}</span>
                      </div>

                      {/* Tags */}
                      {contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {contact.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="px-1 py-0.5 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 2 && (
                            <span className="px-1 py-0.5 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                              +{contact.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Activity Indicators */}
                      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>📧 {contact.emailCount}</span>
                        <span>📅 {contact.meetingCount}</span>
                        <span>⭐ {contact.leadScore}</span>
                      </div>
                    </div>
                  ))}

                  {stageContacts.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <p className="text-sm">No contacts</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Contact Details Modal */}
        {selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Contact Details
                </h3>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <div className="text-gray-800 dark:text-white">{selectedContact.name}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="text-gray-800 dark:text-white">{selectedContact.email}</div>
                </div>

                {selectedContact.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <div className="text-gray-800 dark:text-white">{selectedContact.phone}</div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source
                  </label>
                  <div className="text-gray-800 dark:text-white">{selectedContact.source}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="text-gray-800 dark:text-white capitalize">{selectedContact.status}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lead Score
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs text-white rounded-full ${getLeadScoreColor(selectedContact.leadScore)}`}>
                      {getLeadScoreLabel(selectedContact.leadScore)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">({selectedContact.leadScore}/100)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Activity
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>📧 {selectedContact.emailCount} emails</div>
                    <div>📅 {selectedContact.meetingCount} meetings</div>
                    <div>📅 Last contact: {new Date(selectedContact.lastContact).toLocaleDateString()}</div>
                  </div>
                </div>

                {selectedContact.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {selectedContact.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContact.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <div className="text-gray-800 dark:text-white text-sm">{selectedContact.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Add New Contact
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source
                  </label>
                  <select className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social">Social Media</option>
                    <option value="email">Email</option>
                    <option value="calendar">Calendar</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Add Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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

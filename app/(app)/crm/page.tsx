'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Toast from '@/components/Toast'

export const dynamic = 'force-dynamic'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  title?: string
  notes?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function CRMPage() {
  const { data: session, status } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

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
        setContacts(prev => [...prev, ...data.contacts])
        addToast(`Synced ${data.contacts.length} contacts from email`, 'success')
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
        setContacts(prev => [...prev, ...data.contacts])
        addToast(`Synced ${data.contacts.length} contacts from calendar`, 'success')
      } else {
        addToast('Failed to sync from calendar')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateContactStatus = async (contactId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setContacts(prev => 
          prev.map(contact => 
            contact.id === contactId 
              ? { ...contact, status: newStatus as any }
              : contact
          )
        )
        addToast('Contact status updated', 'success')
      } else {
        addToast('Failed to update contact status')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchContacts()
    }
  }, [status])

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
      case 'contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
      case 'qualified': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
      case 'proposal': return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
      case 'closing': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-800 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-800 dark:text-white">You need to sign in.</div>
      </div>
    )
  }

  return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="h1">CRM</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Manage your leads and contacts
          </p>
        </div>

        {/* Controls */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
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
          </div>
        </div>

        {/* Contacts List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="h2">Contacts</h2>
            <button
              onClick={fetchContacts}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">Loading contacts...</div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">
                {contacts.length === 0 ? 'No contacts found. Try syncing from email or calendar.' : 'No contacts match your search.'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-purple-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800 dark:text-white">
                      {contact.firstName} {contact.lastName}
                    </h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {contact.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {contact.email}
                    </p>
                  )}
                  
                  {contact.company && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {contact.company} {contact.title && `• ${contact.title}`}
                    </p>
                  )}
                  
                  {contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {contact.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {contact.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {contact.notes}
                    </p>
                  )}
                </div>
              ))}
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

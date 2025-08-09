'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  tags: string[]
  createdAt: string
}

interface Lead {
  id: string
  title: string
  status: string
  source?: string
  contact?: Contact
  createdAt: string
}

export default function CRMPage() {
  const { data: session, status } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Contact form state
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    tags: '',
  })

  // Lead form state
  const [leadForm, setLeadForm] = useState({
    title: '',
    status: 'new',
    source: '',
    contactId: '',
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchContacts()
      fetchLeads()
    }
  }, [session?.user?.id])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/crm/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts)
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/crm/leads')
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: contactForm.firstName,
          lastName: contactForm.lastName,
          email: contactForm.email,
          tags: contactForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        }),
      })

      if (response.ok) {
        setContactForm({ firstName: '', lastName: '', email: '', tags: '' })
        fetchContacts()
      } else {
        setError('Failed to add contact')
      }
    } catch (error) {
      setError('Failed to add contact')
      console.error('Add contact error:', error)
    }
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: leadForm.title,
          status: leadForm.status,
          source: leadForm.source,
          contactId: leadForm.contactId || null,
        }),
      })

      if (response.ok) {
        setLeadForm({ title: '', status: 'new', source: '', contactId: '' })
        fetchLeads()
      } else {
        setError('Failed to add lead')
      }
    } catch (error) {
      setError('Failed to add lead')
      console.error('Add lead error:', error)
    }
  }

  if (status === 'loading' || loading) {
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
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Castra CRM
          </h1>
          <p className="text-xl text-gray-300">
            Manage your contacts and leads
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contacts Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contacts</h2>
            
            <form onSubmit={handleAddContact} className="mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="First Name"
                  value={contactForm.firstName}
                  onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={contactForm.lastName}
                  onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={contactForm.tags}
                onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors"
              >
                Add Contact
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-3 bg-gray-700 rounded">
                  <div className="font-medium text-white">
                    {contact.firstName} {contact.lastName}
                  </div>
                  {contact.email && (
                    <div className="text-gray-300 text-sm">{contact.email}</div>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="text-gray-400 text-xs mt-1">
                      {contact.tags.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leads Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Leads</h2>
            
            <form onSubmit={handleAddLead} className="mb-6 space-y-3">
              <input
                type="text"
                placeholder="Lead Title"
                value={leadForm.title}
                onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={leadForm.status}
                onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="converted">Converted</option>
              </select>
              <input
                type="text"
                placeholder="Source"
                value={leadForm.source}
                onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={leadForm.contactId}
                onChange={(e) => setLeadForm({ ...leadForm, contactId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium transition-colors"
              >
                Add Lead
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {leads.map((lead) => (
                <div key={lead.id} className="p-3 bg-gray-700 rounded">
                  <div className="font-medium text-white">{lead.title}</div>
                  <div className="text-gray-300 text-sm">
                    Status: <span className="capitalize">{lead.status}</span>
                  </div>
                  {lead.source && (
                    <div className="text-gray-300 text-sm">Source: {lead.source}</div>
                  )}
                  {lead.contact && (
                    <div className="text-gray-400 text-xs mt-1">
                      Contact: {lead.contact.firstName} {lead.contact.lastName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

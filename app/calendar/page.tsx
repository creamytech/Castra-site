'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import Toast from '@/components/Toast'

export const dynamic = 'force-dynamic'

interface CalEvent {
  id: string
  summary: string
  start: string
  end: string
  attendees?: string[]
  description?: string
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [newEvent, setNewEvent] = useState({
    summary: '',
    startISO: '',
    endISO: '',
    attendees: ''
  })

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const fetchUpcomingEvents = async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      const response = await fetch('/api/calendar/upcoming')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      } else {
        setEventsError('Failed to fetch events')
        addToast('Failed to fetch upcoming events')
      }
    } catch (error) {
      setEventsError('Network error')
      addToast('Network error. Please try again.')
    } finally {
      setEventsLoading(false)
    }
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.summary || !newEvent.startISO || !newEvent.endISO) {
      addToast('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: newEvent.summary,
          startISO: newEvent.startISO,
          endISO: newEvent.endISO,
          attendees: newEvent.attendees ? newEvent.attendees.split(',').map(email => email.trim()) : []
        })
      })

      if (response.ok) {
        addToast('Event created successfully!', 'success')
        setNewEvent({ summary: '', startISO: '', endISO: '', attendees: '' })
        fetchUpcomingEvents() // Refresh events
      } else {
        addToast('Failed to create event')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUpcomingEvents()
    }
  }, [status])

  const formatRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`
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
          <div className="text-gray-800 dark:text-white">You need to sign in.</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="h1">Calendar</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Manage your schedule and appointments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Event Form */}
          <div className="card">
            <h2 className="h2 mb-4">Create New Event</h2>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Meeting with client"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.startISO}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startISO: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.endISO}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endISO: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attendees (comma-separated emails)
                </label>
                <input
                  type="text"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, attendees: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="client@example.com, colleague@example.com"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary"
              >
                Create Event
              </button>
            </form>
          </div>

          {/* Upcoming Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">Upcoming Events</h2>
              <button
                onClick={fetchUpcomingEvents}
                disabled={eventsLoading}
                className="btn-secondary text-sm"
              >
                {eventsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {eventsLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-600 dark:text-gray-400">Loading events...</div>
              </div>
            ) : eventsError ? (
              <div className="text-center py-8">
                <div className="text-red-600 dark:text-red-400">{eventsError}</div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-600 dark:text-gray-400">No upcoming events</div>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-purple-500"
                  >
                    <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                      {event.summary}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {formatRange(event.start, event.end)}
                    </p>
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Attendees: {event.attendees.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
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

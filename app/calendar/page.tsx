'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

type CalEvent = {
  id: string
  summary: string
  startISO: string | null
  endISO: string | null
  attendees: string[]
  location: string | null
  hangoutLink: string | null
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [events, setEvents] = useState<CalEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchUpcomingEvents()
  }, [session])

  const fetchUpcomingEvents = async () => {
    if (!session?.user) return
    
    setEventsLoading(true)
    setEventsError(null)
    
    try {
      const response = await fetch('/api/calendar/upcoming?max=10')
      if (!response.ok) {
        throw new Error('Failed to load events')
      }
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error: any) {
      setEventsError(error.message || 'Failed to load events')
    } finally {
      setEventsLoading(false)
    }
  }

  const suggestTimeSlots = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/calendar/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          window: 'Next 3 days',
          constraints: 'Business hours only'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestedSlots(data.slots || [])
      } else {
        console.error('Failed to get time slots')
      }
    } catch (error) {
      console.error('Error suggesting time slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async (summary: string, startTime: string, endTime: string) => {
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          startISO: startTime,
          endISO: endTime,
          attendees: []
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert('Calendar event created successfully!')
        // Refresh events after creating a new one
        fetchUpcomingEvents()
        return data.event
      } else {
        console.error('Failed to create calendar event')
      }
    } catch (error) {
      console.error('Error creating calendar event:', error)
    }
  }

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot)
    const startTime = new Date(slot)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour later
    
    createEvent(
      'Meeting with Castra AI',
      startTime.toISOString(),
      endTime.toISOString()
    )
  }

  const formatRange = (startISO: string | null, endISO: string | null) => {
    if (!startISO) return ''
    const start = new Date(startISO)
    const end = endISO ? new Date(endISO) : null
    const date = start.toLocaleDateString([], { month: 'short', day: 'numeric' })
    const st = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const et = end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
    return `${date} · ${st}${et ? '–' + et : ''}`
  }

  const formatTimeSlot = (slot: string) => {
    const date = new Date(slot)
    return date.toLocaleString('en-US', {
      weekday: 'short',
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
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ThemeToggle />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Calendar</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Schedule meetings and manage your calendar
          </p>
        </div>

        {/* Back to Dashboard */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/connect')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Calendar Content */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={suggestTimeSlots}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg p-4 text-center transition-colors"
              >
                <div className="text-2xl mb-2">🤖</div>
                <div className="text-white font-medium">
                  {loading ? 'Getting Suggestions...' : 'AI Suggest Times'}
                </div>
                <div className="text-purple-200 text-sm">Get AI-powered time suggestions</div>
              </button>

              <button
                onClick={fetchUpcomingEvents}
                disabled={eventsLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg p-4 text-center transition-colors"
              >
                <div className="text-2xl mb-2">🔄</div>
                <div className="text-white font-medium">
                  {eventsLoading ? 'Refreshing...' : 'Refresh Events'}
                </div>
                <div className="text-blue-200 text-sm">Update calendar events</div>
              </button>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
              Upcoming Events
            </h2>
            
            {eventsLoading && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span>Loading upcoming events...</span>
              </div>
            )}
            
            {eventsError && (
              <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{eventsError}</p>
              </div>
            )}
            
            {!eventsLoading && !eventsError && events.length === 0 && (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <div className="text-4xl mb-4">📅</div>
                <p>No upcoming events found.</p>
                <p className="text-sm mt-2">Try creating one from the chat or use the "AI Suggest Times" feature.</p>
              </div>
            )}
            
            {!eventsLoading && !eventsError && events.length > 0 && (
              <div className="space-y-3">
                {events.map(ev => (
                  <div key={ev.id} className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-800 dark:text-white">{ev.summary}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{formatRange(ev.startISO, ev.endISO)}</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {ev.location && <span>📍 {ev.location} · </span>}
                      {ev.attendees.length > 0 && <span>👥 {ev.attendees.join(', ')}</span>}
                      {ev.hangoutLink && (
                        <a 
                          className="ml-2 underline text-blue-600 dark:text-blue-400" 
                          href={ev.hangoutLink} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Join
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Time Slots */}
          {suggestedSlots.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Suggested Time Slots
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedSlots.map((slot, index) => {
                  const date = new Date(slot)
                  const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })

                  return (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      className="bg-green-600 hover:bg-green-700 rounded-lg p-4 text-center transition-colors"
                    >
                      <div className="text-white font-medium">{formattedDate}</div>
                      <div className="text-green-200 text-sm">Click to schedule</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Calendar Integration Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Calendar Integration
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Google Calendar</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Event Creation</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Available</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">AI Suggestions</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Events Loaded</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {events.length} upcoming
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

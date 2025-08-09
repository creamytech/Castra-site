'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-white dark:text-white text-gray-800">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <ThemeToggle />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Calendar
          </h1>
          <p className="text-xl text-gray-300 dark:text-gray-300 text-gray-700">
            Schedule meetings and manage your calendar
          </p>
        </div>

        {/* Back to Dashboard */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/connect')}
            className="text-gray-400 dark:text-gray-400 text-gray-600 hover:text-white dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Calendar Content */}
        <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-6 shadow-lg">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-semibold text-white dark:text-white text-gray-800 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={suggestTimeSlots}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="text-white font-medium">
                    {loading ? 'Getting Suggestions...' : 'AI Suggest Times'}
                  </div>
                  <div className="text-orange-200 text-sm">Get AI-powered time suggestions</div>
                </button>

                <div className="bg-gray-700 dark:bg-gray-700 bg-gray-100 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">📅</div>
                  <div className="text-white dark:text-white text-gray-800 font-medium">View Calendar</div>
                  <div className="text-gray-300 dark:text-gray-300 text-gray-600 text-sm">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* Suggested Time Slots */}
            {suggestedSlots.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white dark:text-white text-gray-800 mb-4">
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
                        className="bg-blue-600 hover:bg-blue-700 rounded-lg p-4 text-center transition-colors"
                      >
                        <div className="text-white font-medium">{formattedDate}</div>
                        <div className="text-blue-200 text-sm">Click to schedule</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Calendar Integration Status */}
            <div className="bg-gray-700 dark:bg-gray-700 bg-gray-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white dark:text-white text-gray-800 mb-4">
                Calendar Integration
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 dark:text-gray-300 text-gray-600">Google Calendar</span>
                  <span className="text-green-400 font-medium">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 dark:text-gray-300 text-gray-600">Event Creation</span>
                  <span className="text-green-400 font-medium">Available</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 dark:text-gray-300 text-gray-600">AI Suggestions</span>
                  <span className="text-green-400 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timeSlots?: string[]
  schedulingRequest?: boolean
  htmlPreview?: string
  isEmailPreview?: boolean
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Check if this is a scheduling request
        const isSchedulingRequest = userMessage.toLowerCase().includes('schedule') || 
                                  userMessage.toLowerCase().includes('meeting') ||
                                  userMessage.toLowerCase().includes('appointment') ||
                                  userMessage.toLowerCase().includes('time')

        // Check if this is a listing cover email request
        const isListingCoverRequest = userMessage.toLowerCase().includes('prepare listing cover email') ||
                                    userMessage.toLowerCase().includes('listing cover') ||
                                    userMessage.toLowerCase().includes('cover email')

        if (isSchedulingRequest) {
          // Get time slots
          const slotsResponse = await fetch('/api/calendar/suggest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              window: userMessage,
              constraints: '',
            }),
          })

          if (slotsResponse.ok) {
            const slotsData = await slotsResponse.json()
            setMessages([...newMessages, { 
              role: 'assistant', 
              content: data.message,
              timeSlots: slotsData.slots,
              schedulingRequest: true
            }])
          } else {
            setMessages([...newMessages, { role: 'assistant', content: data.message }])
            addToast('Failed to get time slots', 'error')
          }
        } else if (isListingCoverRequest) {
          // Check if the response contains HTML preview
          const assistantMessage = data.message
          const htmlMatch = assistantMessage.match(/```html\n([\s\S]*?)\n```/)
          
          if (htmlMatch) {
            const htmlContent = htmlMatch[1]
            setMessages([...newMessages, { 
              role: 'assistant', 
              content: assistantMessage.replace(/```html\n[\s\S]*?\n```/, ''),
              htmlPreview: htmlContent,
              isEmailPreview: true
            }])
          } else {
            setMessages([...newMessages, { role: 'assistant', content: data.message }])
          }
        } else {
          setMessages([...newMessages, { role: 'assistant', content: data.message }])
        }
      } else {
        const errorData = await response.json()
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: errorData.error || 'Sorry, I encountered an error. Please try again.' 
        }])
        addToast(errorData.error || 'Chat request failed', 'error')
      }
    } catch (error) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
      addToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSlotSelect = async (slot: string, index: number) => {
    try {
      const endTime = new Date(slot)
      endTime.setMinutes(endTime.getMinutes() + 45) // 45-minute meeting

      const response = await fetch('/api/calendar/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: 'Property Meeting',
          startISO: slot,
          endISO: endTime.toISOString(),
          attendees: [],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Calendar event created for ${new Date(slot).toLocaleString()}! Event ID: ${data.eventId}`
        }])
        addToast('Calendar event created successfully', 'success')
      } else {
        const errorData = await response.json()
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Failed to create calendar event. Please try again.'
        }])
        addToast(errorData.error || 'Failed to create calendar event', 'error')
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to create calendar event. Please try again.'
      }])
      addToast('Network error. Please try again.', 'error')
    }
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/connect"
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Castra Chat
            </h1>
            <p className="text-xl text-gray-300">
              AI-powered realtor assistant
            </p>
          </div>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="mb-4">Try these example queries:</p>
                <div className="space-y-2 text-sm">
                  <p>"Show hot buyer leads last 30 days (table)."</p>
                  <p>"Draft follow-up to jane@buyer.com about 123 Elm St, subject 'Next steps'."</p>
                  <p>"Schedule a meeting for tomorrow afternoon."</p>
                  <p>"Prepare listing cover email for John re: 123 Elm St"</p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div>
                      <div dangerouslySetInnerHTML={{ __html: message.content }} />
                      {message.timeSlots && message.schedulingRequest && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium">Available times:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.timeSlots.map((slot, slotIndex) => (
                              <button
                                key={slotIndex}
                                onClick={() => handleTimeSlotSelect(slot, slotIndex)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition-colors"
                              >
                                {formatTimeSlot(slot)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {message.htmlPreview && message.isEmailPreview && (
                        <div className="mt-4">
                          <p className="text-sm font-medium">Email Preview:</p>
                          <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                            <div dangerouslySetInnerHTML={{ __html: message.htmlPreview }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Castra anything..."
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
            >
              Send
            </button>
          </form>
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

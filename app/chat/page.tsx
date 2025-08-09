'use client'

import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import Toast from '@/components/Toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timeSlots?: string[]
  schedulingRequest?: boolean
  htmlPreview?: string
  isEmailPreview?: boolean
}

interface Conversation {
  id: string
  title: string
  timestamp: Date
  messages: Message[]
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
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

  const startNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      timestamp: new Date(),
      messages: []
    }
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversation(newConversation)
    setMessages([])
  }

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
    setMessages(conversation.messages)
  }

  const updateConversationTitle = (conversationId: string, title: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, title } : conv
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    // Update conversation title if it's the first message
    if (currentConversation && currentConversation.messages.length === 0) {
      const title = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage
      updateConversationTitle(currentConversation.id, title)
    }

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
                                  userMessage.toLowerCase().includes('time') ||
                                  userMessage.toLowerCase().includes('book') ||
                                  userMessage.toLowerCase().includes('showing') ||
                                  userMessage.toLowerCase().includes('call')

        // Check if this is a listing cover email request
        const isListingCoverRequest = userMessage.toLowerCase().includes('prepare listing cover email') ||
                                    userMessage.toLowerCase().includes('listing cover') ||
                                    userMessage.toLowerCase().includes('cover email')

        // Check if this is a direct calendar event creation
        const isDirectCalendarCreation = userMessage.toLowerCase().includes('book a showing') ||
                                       userMessage.toLowerCase().includes('schedule a meeting') ||
                                       userMessage.toLowerCase().includes('create event') ||
                                       userMessage.toLowerCase().includes('add to calendar')

        let assistantMessage: Message

        if (isDirectCalendarCreation) {
          // Try to extract event details and create directly
          try {
            const eventDetails = await extractEventDetails(userMessage)
            if (eventDetails) {
              const eventResponse = await createCalendarEvent(eventDetails)
              assistantMessage = {
                role: 'assistant',
                content: `✅ Calendar event created successfully!\n\n**Event Details:**\n- Summary: ${eventDetails.summary}\n- Date: ${eventDetails.startTime}\n- Duration: ${eventDetails.duration} minutes\n- Attendees: ${eventDetails.attendees.join(', ') || 'None'}\n\nEvent ID: ${eventResponse.id}`
              }
            } else {
              // Fall back to AI suggestions
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
                assistantMessage = {
                  role: 'assistant',
                  content: data.message,
                  timeSlots: slotsData.slots,
                  schedulingRequest: true
                }
              } else {
                assistantMessage = { role: 'assistant', content: data.message }
                addToast('Failed to get time slots', 'error')
              }
            }
          } catch (error) {
            assistantMessage = { role: 'assistant', content: 'Sorry, I couldn\'t create the calendar event. Please try again with more specific details.' }
            addToast('Failed to create calendar event', 'error')
          }
        } else if (isSchedulingRequest) {
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
            assistantMessage = {
              role: 'assistant',
              content: data.message,
              timeSlots: slotsData.slots,
              schedulingRequest: true
            }
          } else {
            assistantMessage = { role: 'assistant', content: data.message }
            addToast('Failed to get time slots', 'error')
          }
        } else if (isListingCoverRequest) {
          // Check if the response contains HTML preview
          const assistantMessageContent = data.message
          const htmlMatch = assistantMessageContent.match(/```html\n([\s\S]*?)\n```/)
          
          if (htmlMatch) {
            const htmlContent = htmlMatch[1]
            assistantMessage = {
              role: 'assistant',
              content: assistantMessageContent.replace(/```html\n[\s\S]*?\n```/, ''),
              htmlPreview: htmlContent,
              isEmailPreview: true
            }
          } else {
            assistantMessage = { role: 'assistant', content: data.message }
          }
        } else {
          assistantMessage = { role: 'assistant', content: data.message }
        }

        const finalMessages = [...newMessages, assistantMessage]
        setMessages(finalMessages)

        // Update conversation
        if (currentConversation) {
          const updatedConversation = { ...currentConversation, messages: finalMessages }
          setConversations(prev => prev.map(conv => 
            conv.id === currentConversation.id ? updatedConversation : conv
          ))
        }
      } else {
        const errorData = await response.json()
        const errorMessage: Message = { 
          role: 'assistant', 
          content: errorData.error || 'Sorry, I encountered an error. Please try again.' 
        }
        setMessages([...newMessages, errorMessage])
        addToast(errorData.error || 'Chat request failed', 'error')
      }
    } catch (error) {
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }
      setMessages([...newMessages, errorMessage])
      addToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const extractEventDetails = async (message: string): Promise<any> => {
    try {
      const response = await fetch('/api/calendar/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.eventDetails
      }
      return null
    } catch (error) {
      console.error('Failed to extract event details:', error)
      return null
    }
  }

  const createCalendarEvent = async (eventDetails: any) => {
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: eventDetails.summary,
          startISO: eventDetails.startTime,
          endISO: eventDetails.endTime,
          attendees: eventDetails.attendees || [],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.event
      } else {
        throw new Error('Failed to create calendar event')
      }
    } catch (error) {
      console.error('Failed to create calendar event:', error)
      throw error
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
        const successMessage: Message = {
          role: 'assistant',
          content: `✅ Calendar event created for ${new Date(slot).toLocaleString()}! Event ID: ${data.eventId}`
        }
        setMessages(prev => [...prev, successMessage])
        addToast('Calendar event created successfully', 'success')
      } else {
        const errorData = await response.json()
        const errorMessage: Message = {
          role: 'assistant',
          content: '❌ Failed to create calendar event. Please try again.'
        }
        setMessages(prev => [...prev, errorMessage])
        addToast(errorData.error || 'Failed to create calendar event', 'error')
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Failed to create calendar event. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
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

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
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
    <MainLayout showSidebar={false}>
      <div className="flex h-screen">
        {/* Left Column - Conversation History */}
        <div className="w-80 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Conversations</h2>
            <button
              onClick={startNewConversation}
              className="btn-primary w-full"
            >
              + New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentConversation?.id === conversation.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
                }`}
              >
                <div className="font-medium truncate">{conversation.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatTimestamp(conversation.timestamp)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Active Chat */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {currentConversation ? currentConversation.title : 'Castra Chat'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              AI-powered realtor assistant
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <p className="mb-4">Try these example queries:</p>
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    "Show hot buyer leads last 30 days (table)."
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    "Draft follow-up to jane@buyer.com about 123 Elm St, subject 'Next steps'."
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    "Schedule a meeting for tomorrow afternoon."
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    "Prepare listing cover email for John re: 123 Elm St"
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`message-bubble ${
                    message.role === 'user' ? 'message-user' : 'message-ai'
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
                <div className="message-bubble message-ai">
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
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Castra anything..."
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-primary"
              >
                Send
              </button>
            </form>
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

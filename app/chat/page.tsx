'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/MainLayout'
import Toast from '@/components/Toast'

export const dynamic = 'force-dynamic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastUpdated: Date
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

export default function ChatPage() {
  const [session, setSession] = useState<any>(null)
  const [status, setStatus] = useState<string>('loading')
  const [mounted, setMounted] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only use useSession on the client side
  const { data: sessionData, status: sessionStatus } = useSession()

  useEffect(() => {
    if (mounted) {
      setSession(sessionData)
      setStatus(sessionStatus)
    }
  }, [sessionData, sessionStatus, mounted])

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      lastUpdated: new Date()
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
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title, lastUpdated: new Date() }
          : conv
      )
    )
  }

  const extractEventDetails = (message: string) => {
    // Simple event extraction - in a real app, you'd use AI
    const eventRegex = /(?:schedule|book|meeting|appointment|call|meet).*?(?:with|to|for)\s+([^,]+?)(?:\s+on\s+([^,]+?))?(?:\s+at\s+([^,]+?))?/i
    const match = message.match(eventRegex)
    if (match) {
      return {
        summary: match[0],
        attendee: match[1]?.trim(),
        date: match[2]?.trim(),
        time: match[3]?.trim()
      }
    }
    return null
  }

  const createCalendarEvent = async (eventDetails: any) => {
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: eventDetails.summary,
          startISO: new Date().toISOString(),
          endISO: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
          attendees: eventDetails.attendee ? [eventDetails.attendee] : []
        })
      })
      
      if (response.ok) {
        addToast('Calendar event created successfully!', 'success')
        return true
      } else {
        addToast('Failed to create calendar event')
        return false
      }
    } catch (error) {
      addToast('Network error creating calendar event')
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Check if this is a calendar event request
      const eventDetails = extractEventDetails(inputMessage)
      if (eventDetails) {
        const success = await createCalendarEvent(eventDetails)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: success 
            ? `✅ Calendar event created: "${eventDetails.summary}"`
            : '❌ Failed to create calendar event. Please try again.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      }

      // Regular chat request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorData = await response.json()
        addToast(errorData.error || 'Failed to get response')
      }
    } catch (error) {
      addToast('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Update current conversation with new messages
  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      const updatedConversation = {
        ...currentConversation,
        messages,
        lastUpdated: new Date()
      }
      setCurrentConversation(updatedConversation)
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id ? updatedConversation : conv
        )
      )
    }
  }, [messages, currentConversation])

  if (!mounted) {
    return (
      <MainLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-800 dark:text-white">Loading...</div>
        </div>
      </MainLayout>
    )
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
      <div className="max-w-7xl mx-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Left Column: Conversation History */}
          <div className="lg:col-span-1">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="h2">Conversations</h2>
                <button onClick={createNewConversation} className="btn-primary text-sm">
                  New Chat
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 lg:max-h-none overflow-y-auto">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentConversation?.id === conversation.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white'
                    }`}
                  >
                    <div className="font-medium truncate">{conversation.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {conversation.lastUpdated.toLocaleDateString()}
                    </div>
                  </button>
                ))}
                
                {conversations.length === 0 && (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a new chat to begin</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Chat Interface */}
          <div className="lg:col-span-3">
            <div className="card h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="mb-2">Start a conversation</h3>
                    <p>Ask me anything about your real estate workflow</p>
                    
                    {/* Example queries */}
                    <div className="mt-6 space-y-2">
                      <button
                        onClick={() => setInputMessage("Draft a follow-up email for a client who viewed a property yesterday")}
                        className="block w-full p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        💌 Draft a follow-up email
                      </button>
                      <button
                        onClick={() => setInputMessage("Schedule a showing with John Smith for tomorrow at 2pm")}
                        className="block w-full p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        📅 Schedule a showing
                      </button>
                      <button
                        onClick={() => setInputMessage("Update my CRM with a new lead from today's open house")}
                        className="block w-full p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        👥 Update CRM lead
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={handleSubmit} className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
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

'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import Toast from '@/components/Toast'
import FadeIn from '@/components/ui/FadeIn'
import { motion, AnimatePresence } from 'framer-motion'

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
  const { data: session, status } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

      // Regular chat request - always send messages array
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || data.reply || 'Sorry, I couldn\'t process your request.',
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
    <div className="max-w-7xl mx-auto h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Left Column: Conversation History */}
        <FadeIn delay={0.1}>
          <div className="lg:col-span-1">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="h2">Conversations</h2>
                <motion.button 
                  onClick={createNewConversation} 
                  className="btn-primary text-sm"
                  whileTap={{ scale: 0.98 }}
                >
                  New Chat
                </motion.button>
              </div>

                          <div className="space-y-2 max-h-96 lg:max-h-none overflow-y-auto">
                <AnimatePresence>
                  {conversations.map((conversation, index) => (
                    <motion.button
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        currentConversation?.id === conversation.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white'
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      layout
                    >
                  <div className="font-medium truncate">{conversation.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {conversation.lastUpdated.toLocaleDateString()}
                  </div>
                                  </motion.button>
                ))}
                </AnimatePresence>

              {conversations.length === 0 && (
                <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new chat to begin</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </FadeIn>

        {/* Right Column: Chat Interface */}
        <FadeIn delay={0.2}>
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
                    <motion.button
                      onClick={() => setInputMessage("Draft a follow-up email for a client who viewed a property yesterday")}
                      className="block w-full p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      💌 Draft a follow-up email
                    </motion.button>
                    <motion.button
                      onClick={() => setInputMessage("Schedule a showing with John Smith for tomorrow at 2pm")}
                      className="block w-full p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      📅 Schedule a showing
                    </motion.button>
                    <motion.button
                      onClick={() => setInputMessage("Update my CRM with a new lead from today's open house")}
                      className="block w-full p-3 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      👥 Update CRM lead
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        layout
                      >
                        <motion.div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                          }`}
                          whileHover={{ scale: 1.01 }}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}>            </div>
          </div>
        </div>
        </FadeIn>
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
                <motion.button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </motion.button>
              </form>
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
    </div>
  )
}

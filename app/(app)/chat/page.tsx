"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addToast = (message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat sessions on mount
  useEffect(() => {
    if (session) {
      loadSessions();
    }
  }, [session]);

  const loadSessions = async () => {
    try {
      const response = await fetch("/api/chat/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        addToast("Failed to load chat sessions");
      }
    } catch (error) {
      addToast("Network error loading sessions");
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" })
      });

      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        setMessages([]);
      } else {
        addToast("Failed to create new session");
      }
    } catch (error) {
      addToast("Network error creating session");
    }
  };

  const selectSession = async (session: ChatSession) => {
    try {
      const response = await fetch(`/api/chat/sessions/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data.session);
        setMessages(data.session.messages || []);
      } else {
        addToast("Failed to load session");
      }
    } catch (error) {
      addToast("Network error loading session");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/chat/sessions/${currentSession.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: inputMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = data.assistantMessage;
        if (assistantMessage) {
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        const errorData = await response.json();
        addToast(errorData.error || "Failed to get response");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-800 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-800 dark:text-white">You need to sign in.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Left Column: Session History */}
        <FadeIn delay={0.1}>
          <div className="lg:col-span-1">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="h2">Chat Sessions</h2>
                <motion.button 
                  onClick={createNewSession} 
                  className="btn-primary text-sm"
                  whileTap={{ scale: 0.98 }}
                >
                  New Chat
                </motion.button>
              </div>

              <div className="space-y-2 max-h-96 lg:max-h-none overflow-y-auto">
                <AnimatePresence>
                  {sessions.map((session, index) => (
                    <motion.button
                      key={session.id}
                      onClick={() => selectSession(session)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        currentSession?.id === session.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      layout
                    >
                      <div className="font-medium truncate">{session.title}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>

                {sessions.length === 0 && (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    <p>No chat sessions yet</p>
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
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          layout
                        >
                          <motion.div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.role === "user"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                            }`}
                            whileHover={{ scale: 1.01 }}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString()}
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
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
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
                  <motion.button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim() || !currentSession}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? "Sending..." : "Send"}
                  </motion.button>
                </form>
              </div>
            </div>
          </div>
        </FadeIn>
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
  );
}

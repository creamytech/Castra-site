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
  const [selecting, setSelecting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
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

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load chat sessions on mount
  useEffect(() => {
    if (session) {
      loadSessions();
    }
  }, [session]);

  const loadSessions = async () => {
    try {
      const response = await fetch("/api/chat/sessions");
      if (!response.ok) throw new Error("Failed to load chat sessions");
      const data = await response.json();
      const loaded: ChatSession[] = data.sessions || [];
      setSessions(loaded);
      if (loaded.length > 0) {
        // Auto-select the most recent session if none selected
        if (!currentSession) {
          await selectSession(loaded[0]);
        }
      }
    } catch (error) {
      addToast("Network error loading sessions");
    }
  };

  const createNewSession = async (title: string = "Draft...") => {
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });

      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        setMessages([]);
        return newSession;
      } else {
        addToast("Failed to create new session");
        return null;
      }
    } catch (error) {
      addToast("Network error creating session");
      return null;
    }
  };

  const selectSession = async (sessionItem: ChatSession) => {
    setSelecting(true);
    try {
      const response = await fetch(`/api/chat/sessions/${sessionItem.id}/messages`);
      if (!response.ok) throw new Error("Failed to load session messages");
      const data = await response.json();
      setCurrentSession(sessionItem);
      setMessages(data.messages || []);
    } catch (error) {
      addToast("Unable to open this chat. Please try again.");
    } finally {
      setSelecting(false);
    }
  };

  const renameSession = async (sessionId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });

      if (response.ok) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, title: newTitle } : s
        ));
        if (currentSession?.id === sessionId) {
          setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null);
        }
        setEditingTitle(null);
        setEditingValue("");
        addToast("Session renamed successfully", "success");
      } else {
        const errorData = await response.json();
        addToast(errorData.error || "Failed to rename session");
      }
    } catch (error) {
      addToast("Network error renaming session");
    }
  };

  const startEditing = (session: ChatSession) => {
    setEditingTitle(session.id);
    setEditingValue(session.title);
  };

  const handleRenameSubmit = (e: React.FormEvent, sessionId: string) => {
    e.preventDefault();
    if (editingValue.trim()) {
      renameSession(sessionId, editingValue.trim());
    }
  };

  const cancelEditing = () => {
    setEditingTitle(null);
    setEditingValue("");
  };

  const handleRenameBlur = (sessionId: string) => {
    if (editingValue.trim()) {
      renameSession(sessionId, editingValue.trim());
    } else {
      cancelEditing();
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let sessionToUse = currentSession;
    
    // Auto-create session if none exists
    if (!sessionToUse) {
      sessionToUse = await createNewSession();
      if (!sessionToUse) return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call the session-specific message API
      const response = await fetch(`/api/chat/sessions/${sessionToUse.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: inputMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the assistant message if it exists
        if (data.assistantMessage) {
          const assistantMessage: Message = {
            id: data.assistantMessage.id,
            role: "assistant",
            content: data.assistantMessage.content,
            createdAt: data.assistantMessage.createdAt,
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
        
        // Auto-generate title after first assistant response if title is still "Draft..."
        if (sessionToUse && sessionToUse.title === "Draft..." && messages.length === 0) {
          const suggestedTitle = inputMessage.slice(0, 30) + (inputMessage.length > 30 ? "..." : "");
          renameSession(sessionToUse.id, suggestedTitle);
        }
      } else {
        addToast("Failed to send message");
      }
    } catch (error) {
      addToast("Network error sending message");
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
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-foreground">Please sign in to access chat.</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Left Column: Chat Sessions */}
        <FadeIn delay={0.1}>
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Chat Sessions</h2>
                  <button
                    onClick={() => createNewSession()}
                    className="btn-primary text-sm"
                  >
                    + New
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <AnimatePresence>
                  {sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="mb-2"
                    >
                      {editingTitle === session.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleRenameBlur(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSubmit(e as any, session.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm bg-input border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleRenameSubmit({ preventDefault: () => {} } as any, session.id)} 
                            className="text-xs text-primary hover:text-primary/80"
                          >
                            ✓
                          </button>
                          <button type="button" onClick={cancelEditing} className="text-xs text-muted-foreground hover:text-foreground">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            onClick={() => selectSession(session)}
                            className={`flex-1 text-left p-2 rounded-lg transition-colors ${
                              currentSession?.id === session.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            <div className="font-medium text-sm truncate">
                              {session.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </div>
                          </button>
                          <button
                            onClick={() => startEditing(session)}
                            className="ml-2 p-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                            title="Rename session"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {sessions.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No chat sessions yet</p>
                    <p className="text-sm">Start typing to create a new chat</p>
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
                  <div className="text-center text-muted-foreground py-8">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="mb-2">Start a conversation</h3>
                    <p>Just start typing to begin chatting - no need to click "New Chat"</p>

                    {/* Example queries */}
                    <div className="mt-6 space-y-2">
                      <motion.button
                        onClick={() => setInputMessage("Draft a follow-up email for a client who viewed a property yesterday")}
                        className="block w-full p-3 text-left bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        💌 Draft a follow-up email
                      </motion.button>
                      <motion.button
                        onClick={() => setInputMessage("Schedule a showing with John Smith for tomorrow at 2pm")}
                        className="block w-full p-3 text-left bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        📅 Schedule a showing
                      </motion.button>
                      <motion.button
                        onClick={() => setInputMessage("Update my CRM with a new lead from today's open house")}
                        className="block w-full p-3 text-left bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
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
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
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
                        <div className="bg-muted px-4 py-2 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="border-t border-border p-4">
                <form onSubmit={handleSubmit} className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message... (auto-creates session)"
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 bg-input border border-input text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <motion.button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

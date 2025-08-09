"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/ui/theme";

interface AssistantDockProps {
  className?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface UserMemory {
  tone?: string;
  signature?: string;
  persona?: string;
}

export default function AssistantDock({ className = "" }: AssistantDockProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [userMemory, setUserMemory] = useState<UserMemory>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get or create session from localStorage
    const storedSessionId = localStorage.getItem("castra-session-id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
      // Load existing messages
      loadSessionMessages(storedSessionId);
    }
    
    // Load user memory
    loadUserMemory();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const loadUserMemory = async () => {
    try {
      const response = await fetch("/api/memory?keys=tone,signature,persona");
      if (response.ok) {
        const data = await response.json();
        const memory: UserMemory = {};
        data.memories?.forEach((m: any) => {
          memory[m.key as keyof UserMemory] = m.value;
        });
        setUserMemory(memory);
      }
    } catch (error) {
      console.error("Failed to load user memory:", error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.session.messages || []);
      }
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  };

  const createSession = async () => {
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Assistant Chat" })
      });

      if (response.ok) {
        const data = await response.json();
        const newSessionId = data.session.id;
        setSessionId(newSessionId);
        localStorage.setItem("castra-session-id", newSessionId);
        setMessages([]);
        return newSessionId;
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || !session) return;

    setIsLoading(true);
    setStreamingMessage("");
    const currentSessionId = sessionId || await createSession();
    
    if (!currentSessionId) {
      setIsLoading(false);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    try {
      // Use streaming endpoint for real-time responses
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/message/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: currentInput,
          memory: userMemory // Pass user memory for context
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Finalize the message
                const finalMessage: Message = {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: assistantMessage,
                  createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, finalMessage]);
                setStreamingMessage("");
                break;
              } else {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    assistantMessage += parsed.content;
                    setStreamingMessage(assistantMessage);
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }
      } else {
        // Fallback to non-streaming if streaming fails
        const fallbackResponse = await fetch(`/api/chat/sessions/${currentSessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "user",
            content: currentInput
          })
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data.assistantMessage) {
            setMessages(prev => [...prev, data.assistantMessage]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openFullChat = () => {
    if (sessionId) {
      window.open(`/chat?sessionId=${sessionId}`, '_blank');
    }
  };

  if (!session) return null;

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="bg-card text-card-foreground rounded-lg shadow-xl border border-border w-80 h-96 mb-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Castra Assistant</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={openFullChat}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    title="Open in full chat"
                  >
                    ↗
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col h-80">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Ask Castra anything about your real estate work...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.slice(-6).map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-xs px-3 py-2 rounded-lg text-sm",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {streamingMessage && (
                      <div className="flex justify-start">
                        <div className="max-w-xs px-3 py-2 rounded-lg text-sm bg-muted text-foreground">
                          <p className="whitespace-pre-wrap">{streamingMessage}</p>
                          <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse ml-1" />
                        </div>
                      </div>
                    )}
                    {isLoading && !streamingMessage && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-3 py-2 rounded-lg">
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
              
              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground placeholder:text-muted-foreground text-sm transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground rounded-md transition-colors text-sm focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {isLoading ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-12 h-12 shadow-lg flex items-center justify-center transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        💬
      </motion.button>
    </div>
  );
}

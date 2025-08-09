"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface AssistantDockProps {
  className?: string;
}

export default function AssistantDock({ className = "" }: AssistantDockProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get or create session from localStorage
    const storedSessionId = localStorage.getItem("castra-session-id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

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
    const currentSessionId = sessionId || await createSession();
    
    if (!currentSessionId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: input
        })
      });

      if (response.ok) {
        setInput("");
        // Optionally show a success indicator
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

  if (!session) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 h-96 mb-4">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Castra Assistant</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4">
            <div className="h-64 overflow-y-auto mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Ask Castra anything about your real estate work...
              </div>
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center transition-colors"
      >
        💬
      </button>
    </div>
  );
}

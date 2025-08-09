"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";

interface Email {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  snippet: string;
  dateISO: string | null;
  labels?: string[];
  isRead?: boolean;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [summary, setSummary] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "sender" | "subject" | "content">("all");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const addToast = (message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchEmails = async () => {
    setLoadingEmails(true);
    try {
      const response = await fetch("/api/inbox?maxResults=50");
      if (response.ok) {
        const data = await response.json();
        const emailsWithLabels = (data.threads || []).map((email: any) => ({
          ...email,
          dateISO: email.dateISO || null,
          labels: email.labels || [],
          isRead: email.isRead || false
        }));
        setEmails(emailsWithLabels);
        setFilteredEmails(emailsWithLabels);
      } else {
        addToast("Failed to fetch emails");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchEmails();
    }
  }, [status]);

  // Filter emails based on search term and filters
  useEffect(() => {
    let filtered = emails;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(email => {
        switch (searchFilter) {
          case "sender":
            return email.sender.toLowerCase().includes(term);
          case "subject":
            return email.subject.toLowerCase().includes(term);
          case "content":
            return email.snippet.toLowerCase().includes(term);
          default:
            return (
              email.sender.toLowerCase().includes(term) ||
              email.subject.toLowerCase().includes(term) ||
              email.snippet.toLowerCase().includes(term)
            );
        }
      });
    }

    if (selectedLabels.length > 0) {
      filtered = filtered.filter(email => 
        email.labels?.some(label => selectedLabels.includes(label))
      );
    }

    setFilteredEmails(filtered);
  }, [emails, searchTerm, searchFilter, selectedLabels]);

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);
    setLoading(true);
    setSummary(""); // Clear previous summary
    
    try {
      // Call the correct summarize API endpoint
      const response = await fetch("/api/email/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: email.threadId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary || "No summary available");
        
        if (data.cached) {
          addToast("Summary loaded from cache", "info");
        }
      } else {
        const errorData = await response.json();
        addToast(errorData.error || "Failed to fetch email summary");
        setSummary("Summary unavailable");
      }
    } catch (error) {
      console.error("Email summarize error:", error);
      addToast("Network error. Please try again.");
      setSummary("Summary unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!selectedEmail) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/email/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedEmail.threadId,
          subject: selectedEmail.subject,
          sender: selectedEmail.sender,
          content: selectedEmail.snippet
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDraftHtml(data.draftHtml || "");
        addToast("Draft created successfully!", "success");
      } else {
        addToast("Failed to create draft");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateISO: string | null) => {
    if (!dateISO) return "Unknown date";
    try {
      const date = new Date(dateISO);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        // Today - show time
        return date.toLocaleTimeString([], { 
          hour: "numeric", 
          minute: "2-digit" 
        });
      } else if (diffInHours < 48) {
        // Yesterday
        return "Yesterday";
      } else if (diffInHours < 168) {
        // Within a week - show day
        return date.toLocaleDateString([], { 
          weekday: "short" 
        });
      } else {
        // Older - show full date
        return date.toLocaleDateString([], { 
          month: "short", 
          day: "numeric" 
        });
      }
    } catch {
      return "Invalid date";
    }
  };

  const getUniqueLabels = () => {
    const labels = new Set<string>();
    emails.forEach(email => {
      email.labels?.forEach(label => labels.add(label));
    });
    return Array.from(labels);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Column: Email List */}
        <FadeIn delay={0.1}>
          <div className="lg:col-span-1">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="h2">Inbox</h2>
                <motion.button 
                  onClick={fetchEmails} 
                  className="btn-secondary text-sm"
                  whileTap={{ scale: 0.98 }}
                >
                  Refresh
                </motion.button>
              </div>

              {/* Search and Filters */}
              <div className="mb-4 space-y-2">
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All</option>
                  <option value="sender">Sender</option>
                  <option value="subject">Subject</option>
                  <option value="content">Content</option>
                </select>
              </div>

              {/* Email List */}
              <div className="space-y-2 max-h-96 lg:max-h-none overflow-y-auto">
                {loadingEmails ? (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2">Loading emails...</p>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    <p>No emails found</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredEmails.map((email, index) => (
                      <motion.button
                        key={email.id}
                        onClick={() => handleEmailSelect(email)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedEmail?.id === email.id
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
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate">{email.sender}</span>
                          <span className="text-xs opacity-70">
                            {formatDate(email.dateISO)}
                          </span>
                        </div>
                        <div className="font-semibold truncate text-sm">{email.subject}</div>
                        <div className="text-xs opacity-70 truncate">{email.snippet}</div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Right Column: Email Detail */}
        <FadeIn delay={0.2}>
          <div className="lg:col-span-2">
            <div className="card h-full">
              {selectedEmail ? (
                <div className="h-full flex flex-col">
                  {/* Email Header */}
                  <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{selectedEmail.subject}</h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(selectedEmail.dateISO)}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">From: {selectedEmail.sender}</p>
                  </div>

                  {/* Email Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-800 dark:text-gray-200">{selectedEmail.snippet}</p>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold mb-2">AI Summary</h4>
                    {loading ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                      </div>
                    ) : summary ? (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{summary}</p>
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Click to generate summary</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex space-x-2">
                      <motion.button
                        onClick={handleCreateDraft}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? "Creating..." : "Create Draft"}
                      </motion.button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📧</div>
                    <h3 className="mb-2">Select an email</h3>
                    <p>Choose an email from the list to view details and generate summaries</p>
                  </div>
                </div>
              )}
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

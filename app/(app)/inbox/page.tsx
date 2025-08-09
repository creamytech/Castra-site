"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion, AnimatePresence } from "framer-motion";
import { formatRelativeDate } from "@/lib/dates";

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

interface EmailDetail {
  threadId: string;
  subject: string;
  from: string;
  to: string;
  dateISO: string | null;
  text: string;
  html: string;
  snippet: string;
  messageCount: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

// Debounce hook for search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null);
  const [summary, setSummary] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "sender" | "subject" | "content">("all");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const addToast = (message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchEmails = useCallback(async (searchQuery?: string) => {
    if (!session?.user?.id) return;
    
    setLoadingEmails(true);
    try {
      const params = new URLSearchParams({
        max: "50"
      });
      
      if (searchQuery) {
        params.append("q", searchQuery);
      }
      
      const response = await fetch(`/api/email/threads?${params}`);
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
        const errorData = await response.json().catch(() => ({}));
        addToast(errorData.error || "Failed to fetch emails");
      }
    } catch (error) {
      console.error("Email fetch error:", error);
      addToast("Network error. Please try again.");
    } finally {
      setLoadingEmails(false);
    }
  }, [session?.user?.id, addToast]);

  // Fetch emails when search term changes (debounced)
  useEffect(() => {
    if (status === "authenticated") {
      fetchEmails(debouncedSearchTerm);
    }
  }, [status, debouncedSearchTerm, fetchEmails]);

  // Filter emails based on labels (client-side filtering)
  useEffect(() => {
    let filtered = emails;

    if (selectedLabels.length > 0) {
      filtered = filtered.filter(email => 
        email.labels?.some(label => selectedLabels.includes(label))
      );
    }

    setFilteredEmails(filtered);
  }, [emails, selectedLabels]);

  const handleEmailSelect = async (email: Email) => {
    if (!session?.user?.id) return;
    
    setSelectedEmail(email);
    setLoading(true);
    setSummary("");
    setEmailDetail(null);
    
    try {
      // Fetch email detail
      const detailResponse = await fetch(`/api/email/thread/${email.threadId}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setEmailDetail(detailData);
      } else {
        const errorData = await detailResponse.json().catch(() => ({}));
        addToast(errorData.error || "Failed to fetch email details");
      }

      // Fetch summary
      const summaryResponse = await fetch("/api/email/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: email.threadId })
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary || "No summary available");
        
        if (summaryData.cached) {
          addToast("Summary loaded from cache", "info");
        }
      } else {
        const errorData = await summaryResponse.json().catch(() => ({}));
        addToast(errorData.error || "Failed to fetch email summary");
        setSummary("Summary unavailable");
      }
    } catch (error) {
      console.error("Email detail error:", error);
      addToast("Network error. Please try again.");
      setSummary("Summary unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!selectedEmail || !emailDetail) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/email/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedEmail.threadId,
          subject: selectedEmail.subject,
          sender: selectedEmail.sender,
          content: emailDetail.text || emailDetail.snippet
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDraftHtml(data.draftHtml || "");
        addToast("Draft created successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        addToast(errorData.error || "Failed to create draft");
      }
    } catch (error) {
      console.error("Draft creation error:", error);
      addToast("Network error. Please try again.");
    } finally {
      setLoading(false);
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
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-foreground">You need to sign in.</div>
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
                <h2 className="h2 text-foreground">Inbox</h2>
                <motion.button 
                  onClick={() => fetchEmails()} 
                  className="btn-secondary text-sm"
                  whileTap={{ scale: 0.98 }}
                >
                  Refresh
                </motion.button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Email List */}
              <div className="space-y-2 max-h-96 lg:max-h-none overflow-y-auto">
                {loadingEmails ? (
                  <div className="text-center text-muted-foreground py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2">Loading emails...</p>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>{searchTerm ? "No emails found" : "No emails"}</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredEmails.map((email, index) => (
                      <motion.button
                        key={email.id}
                        onClick={() => handleEmailSelect(email)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedEmail?.id === email.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-accent hover:text-accent-foreground text-foreground"
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
                            {formatRelativeDate(email.dateISO)}
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
              {selectedEmail && emailDetail ? (
                <div className="h-full flex flex-col">
                  {/* Email Header */}
                  <div className="border-b border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{emailDetail.subject}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeDate(emailDetail.dateISO)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">From: {emailDetail.from}</p>
                    <p className="text-muted-foreground">To: {emailDetail.to}</p>
                  </div>

                  {/* Email Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="prose dark:prose-invert max-w-none">
                      {emailDetail.html ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: emailDetail.html }}
                          className="text-foreground"
                        />
                      ) : (
                        <p className="text-foreground whitespace-pre-wrap">
                          {emailDetail.text || emailDetail.snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="border-t border-border p-4">
                    <h4 className="font-semibold mb-2 text-foreground">AI Summary</h4>
                    {loading ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    ) : summary ? (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Loading summary...</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-border p-4">
                    <div className="flex space-x-2">
                      <motion.button
                        onClick={handleCreateDraft}
                        disabled={loading}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? "Creating..." : "Create Draft"}
                      </motion.button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📧</div>
                    <h3 className="mb-2 text-foreground">Select an email</h3>
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

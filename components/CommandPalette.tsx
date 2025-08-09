"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/ui/theme";

interface SearchResult {
  id: string;
  type: "chat" | "contact" | "email" | "event" | "lead";
  title: string;
  subtitle?: string;
  url: string;
  icon: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    router.push(result.url);
    onClose();
  };

  const groupResults = (results: SearchResult[]) => {
    const groups: Record<string, SearchResult[]> = {
      chats: [],
      contacts: [],
      emails: [],
      events: [],
      leads: []
    };

    results.forEach(result => {
      if (groups[result.type + 's']) {
        groups[result.type + 's'].push(result);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const getGroupTitle = (groupKey: string) => {
    const titles: Record<string, string> = {
      chats: "Chat Sessions",
      contacts: "Contacts",
      emails: "Email Threads",
      events: "Calendar Events",
      leads: "Leads"
    };
    return titles[groupKey] || groupKey;
  };

  const getGroupIcon = (groupKey: string) => {
    const icons: Record<string, string> = {
      chats: "💬",
      contacts: "👥",
      emails: "📧",
      events: "📅",
      leads: "🎯"
    };
    return icons[groupKey] || "📄";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-2xl border border-border">
            {/* Search Input */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <span className="text-text-muted">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats, contacts, emails, events..."
                  className="flex-1 bg-transparent text-text placeholder:text-text-muted focus:outline-none text-lg"
                />
                <kbd className="px-2 py-1 text-xs bg-surface-200 dark:bg-surface-700 text-text-muted rounded">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-text-muted">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                  Searching...
                </div>
              ) : results.length === 0 && query ? (
                <div className="p-8 text-center text-text-muted">
                  <div className="text-4xl mb-4">🔍</div>
                  <p>No results found for "{query}"</p>
                  <p className="text-sm mt-2">Try different keywords or check your spelling</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <div className="text-4xl mb-4">⌘K</div>
                  <p>Search for anything in Castra</p>
                  <p className="text-sm mt-2">Chats, contacts, emails, events, and more</p>
                </div>
              ) : (
                <div className="p-2">
                  {groupResults(results).map(([groupKey, groupResults]) => (
                    <div key={groupKey} className="mb-4">
                      <div className="px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wide flex items-center space-x-2">
                        <span>{getGroupIcon(groupKey)}</span>
                        <span>{getGroupTitle(groupKey)}</span>
                        <span className="text-xs bg-surface-200 dark:bg-surface-700 px-2 py-1 rounded">
                          {groupResults.length}
                        </span>
                      </div>
                      {groupResults.map((result, index) => {
                        const globalIndex = results.indexOf(result);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultSelect(result)}
                            className={cn(
                              "w-full text-left p-3 rounded-md transition-colors",
                              isSelected 
                                ? "bg-brand-100 dark:bg-brand-900 text-brand-900 dark:text-brand-100" 
                                : "hover:bg-surface-100 dark:hover:bg-surface-700"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{result.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-text truncate">
                                  {result.title}
                                </div>
                                {result.subtitle && (
                                  <div className="text-sm text-text-muted truncate">
                                    {result.subtitle}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-text-muted">
                                {result.type}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-surface-100 dark:bg-surface-700">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center space-x-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>ESC Close</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Powered by Castra</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

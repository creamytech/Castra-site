"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";

interface CalEvent {
  id: string;
  summary: string;
  startISO: string;
  endISO: string;
  attendees?: string[];
  description?: string;
  location?: string;
  hangoutLink?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [newEvent, setNewEvent] = useState({
    summary: "",
    startISO: "",
    endISO: "",
    attendees: ""
  });

  const addToast = (message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchUpcomingEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const response = await fetch("/api/calendar/upcoming");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        setEventsError("Failed to fetch events");
        addToast("Failed to fetch upcoming events");
      }
    } catch (error) {
      setEventsError("Network error");
      addToast("Network error. Please try again.");
    } finally {
      setEventsLoading(false);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.summary || !newEvent.startISO || !newEvent.endISO) {
      addToast("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/calendar/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: newEvent.summary,
          startISO: newEvent.startISO,
          endISO: newEvent.endISO,
          attendees: newEvent.attendees ? newEvent.attendees.split(",").map(email => email.trim()) : []
        })
      });

      if (response.ok) {
        addToast("Event created successfully!", "success");
        setNewEvent({ summary: "", startISO: "", endISO: "", attendees: "" });
        fetchUpcomingEvents(); // Refresh events
      } else {
        const errorData = await response.json();
        addToast(errorData.error || "Failed to create event");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchUpcomingEvents();
    }
  }, [status]);

  const formatDate = (dateISO: string) => {
    if (!dateISO) return "Unknown date";
    try {
      const date = new Date(dateISO);
      return date.toLocaleDateString([], { 
        month: "short", 
        day: "numeric", 
        hour: "numeric", 
        minute: "2-digit" 
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatRange = (startISO: string, endISO: string) => {
    try {
      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      
      const startFormatted = startDate.toLocaleDateString([], { 
        month: "short", 
        day: "numeric", 
        hour: "numeric", 
        minute: "2-digit" 
      });
      const endFormatted = endDate.toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit" 
      });
      
      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return "Invalid date range";
    }
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
    <div className="max-w-6xl mx-auto">
      <FadeIn>
        <div className="text-center mb-8">
          <h1 className="h1">Calendar</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Manage your schedule and appointments
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Event Form */}
        <FadeIn delay={0.1}>
          <div className="card">
            <h2 className="h2 mb-4">Create New Event</h2>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Meeting with client"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.startISO}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startISO: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.endISO}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endISO: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attendees (comma-separated emails)
                </label>
                <input
                  type="text"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, attendees: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="client@example.com, colleague@example.com"
                />
              </div>

              <motion.button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Create Event
              </motion.button>
            </form>
          </div>
        </FadeIn>

        {/* Upcoming Events */}
        <FadeIn delay={0.2}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">Upcoming Events</h2>
              <motion.button 
                onClick={fetchUpcomingEvents} 
                className="btn-secondary text-sm"
                whileTap={{ scale: 0.98 }}
              >
                Refresh
              </motion.button>
            </div>

            {eventsLoading ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2">Loading events...</p>
              </div>
            ) : eventsError ? (
              <div className="text-center text-red-600 dark:text-red-400 py-8">
                <p>{eventsError}</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <p>No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {event.summary}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatRange(event.startISO, event.endISO)}
                          </p>
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Attendees: {event.attendees.join(", ")}
                              </p>
                            </div>
                          )}
                          {event.location && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              📍 {event.location}
                            </p>
                          )}
                        </div>
                        {event.hangoutLink && (
                          <a
                            href={event.hangoutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 dark:text-purple-400 hover:underline text-sm"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
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

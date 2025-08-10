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

function toRFC3339WithOffset(local: string) {
  // local is from input type="datetime-local" like "2025-08-09T14:30"
  const d = new Date(local);
  const tzOffsetMin = d.getTimezoneOffset();
  const sign = tzOffsetMin > 0 ? "-" : "+";
  const abs = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const iso = new Date(
    d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), 0
  );
  const yyyy = iso.getFullYear();
  const mo = String(iso.getMonth() + 1).padStart(2, "0");
  const day = String(iso.getDate()).padStart(2, "0");
  const H = String(iso.getHours()).padStart(2, "0");
  const M = String(iso.getMinutes()).padStart(2, "0");
  const S = String(iso.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mo}-${day}T${H}:${M}:${S}${sign}${hh}:${mm}`;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [newEvent, setNewEvent] = useState({
    summary: "",
    startLocal: "",
    endLocal: "",
    attendees: "",
    location: "",
    description: "",
  });
  const [view, setView] = useState<"list" | "month">("list");
  const [monthCursor, setMonthCursor] = useState(new Date());

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
    if (!newEvent.summary || !newEvent.startLocal || !newEvent.endLocal) {
      addToast("Please fill in all required fields");
      return;
    }

    try {
      const start = toRFC3339WithOffset(newEvent.startLocal);
      const end = toRFC3339WithOffset(newEvent.endLocal);
      const attendees = newEvent.attendees
        ? newEvent.attendees.split(",").map(email => ({ email: email.trim() })).filter(a => a.email)
        : [];

      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: newEvent.summary,
          description: newEvent.description || undefined,
          location: newEvent.location || undefined,
          start,
          end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
          attendees
        })
      });

      if (response.ok) {
        addToast("Event created successfully!", "success");
        setNewEvent({ summary: "", startLocal: "", endLocal: "", attendees: "", location: "", description: "" });
        fetchUpcomingEvents();
      } else {
        const errorData = await response.json().catch(() => ({}));
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

  const formatRange = (startISO: string, endISO: string) => {
    try {
      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      const startFormatted = startDate.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const endFormatted = endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return "Invalid date range";
    }
  };

  // Month view helpers
  const startOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const endOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const startOfGrid = new Date(startOfMonth);
  startOfGrid.setDate(startOfMonth.getDate() - ((startOfMonth.getDay() + 6) % 7)); // Monday-first grid
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startOfGrid);
    d.setDate(startOfGrid.getDate() + i);
    days.push(d);
  }
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="h1">Calendar</h1>
            <p className="text-xl text-gray-700 dark:text-gray-300">Manage your schedule and appointments</p>
          </div>
          <div className="inline-flex rounded-lg overflow-hidden border border-border">
            <button onClick={() => setView("list")} className={`px-3 py-2 text-sm ${view === "list" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground"}`}>List</button>
            <button onClick={() => setView("month")} className={`px-3 py-2 text-sm ${view === "month" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground"}`}>Month</button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Event Form */}
        <FadeIn delay={0.1}>
          <div className="card">
            <h2 className="h2 mb-4">Create New Event</h2>
            <form onSubmit={createEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startLocal}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startLocal: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.endLocal}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endLocal: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (optional)</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="123 Main St or Google Meet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Agenda or notes"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attendees (comma-separated emails)</label>
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

        {/* Events Panel */}
        <FadeIn delay={0.2}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">{view === "list" ? "Upcoming Events" : "Month"}</h2>
              <div className="flex items-center gap-2">
                {view === "month" && (
                  <div className="inline-flex items-center gap-2">
                    <button onClick={() => setMonthCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="btn-secondary text-sm">←</button>
                    <div className="text-sm text-muted-foreground">
                      {monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
                    </div>
                    <button onClick={() => setMonthCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="btn-secondary text-sm">→</button>
                  </div>
                )}
                <motion.button 
                  onClick={fetchUpcomingEvents} 
                  className="btn-secondary text-sm"
                  whileTap={{ scale: 0.98 }}
                >
                  Refresh
                </motion.button>
              </div>
            </div>

            {view === "list" ? (
              eventsLoading ? (
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
                            <h3 className="font-semibold text-gray-800 dark:text-white">{event.summary}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatRange(event.startISO, event.endISO)}</p>
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Attendees: {event.attendees.join(", ")}</p>
                              </div>
                            )}
                            {event.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">📍 {event.location}</p>
                            )}
                          </div>
                          {event.hangoutLink && (
                            <a href={event.hangoutLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline text-sm">Join</a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                  <div key={d} className="bg-card text-muted-foreground py-2 text-center text-xs font-medium">{d}</div>
                ))}
                {days.map((d, idx) => {
                  const dayEvents = events.filter(ev => isSameDay(new Date(ev.startISO), d));
                  const isCurrentMonth = d.getMonth() === monthCursor.getMonth();
                  const isToday = isSameDay(d, new Date());
                  return (
                    <div key={idx} className={`min-h-[96px] bg-card p-2 ${isCurrentMonth ? "" : "opacity-50"} ${isToday ? "ring-2 ring-purple-500" : ""}`}>
                      <div className="text-xs text-muted-foreground">{d.getDate()}</div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0,3).map(ev => (
                          <div key={ev.id} className="text-[11px] px-2 py-1 rounded bg-muted text-foreground truncate">{ev.summary}</div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </FadeIn>
      </div>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

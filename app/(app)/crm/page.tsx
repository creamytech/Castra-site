"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  title: string;
  description?: string;
  status: string;
  source?: string;
  value?: number;
  contactId?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

export default function CRMPage() {
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showCreateLead, setShowCreateLead] = useState<string | null>(null);

  const addToast = (message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/contacts");
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      } else {
        addToast("Failed to fetch contacts");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/crm/leads");
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      } else {
        addToast("Failed to fetch leads");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    }
  };

  const syncFromEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/sync-email", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setContacts(prev => [...prev, ...data.contacts]);
        addToast(`Synced ${data.contacts.length} contacts from email`, "success");
      } else {
        addToast("Failed to sync from email");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const syncFromCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/sync-calendar", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setContacts(prev => [...prev, ...data.contacts]);
        addToast(`Synced ${data.contacts.length} contacts from calendar`, "success");
      } else {
        addToast("Failed to sync from calendar");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        setContacts(prev => 
          prev.map(contact => 
            contact.id === contactId 
              ? { ...contact, ...updates, updatedAt: new Date().toISOString() }
              : contact
          )
        );
        setEditingContact(null);
        addToast("Contact updated successfully", "success");
      } else {
        addToast("Failed to update contact");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    }
  };

  const createLead = async (contactId: string, leadData: { title: string; description?: string; source?: string; value?: number }) => {
    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadData,
          contactId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeads(prev => [...prev, data.lead]);
        setShowCreateLead(null);
        addToast("Lead created successfully", "success");
      } else {
        addToast("Failed to create lead");
      }
    } catch (error) {
      addToast("Network error. Please try again.");
    }
  };

  const startChat = (contact: Contact) => {
    // This would integrate with the chat system
    const message = `Start a conversation with ${contact.firstName} ${contact.lastName}`;
    // You could open a new chat session or redirect to chat
    addToast(`Chat started with ${contact.firstName} ${contact.lastName}`, "info");
  };

  const sendEmail = (contact: Contact) => {
    // This would integrate with the email draft system
    const subject = `Follow-up with ${contact.firstName} ${contact.lastName}`;
    addToast(`Email draft created for ${contact.firstName} ${contact.lastName}`, "info");
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchContacts();
      fetchLeads();
    }
  }, [status]);

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200";
      case "contacted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200";
      case "qualified": return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200";
      case "proposal": return "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200";
      case "closing": return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
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
    <div className="max-w-7xl mx-auto">
      <FadeIn>
        <div className="text-center mb-8">
          <h1 className="h1">CRM</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            Manage your leads and contacts
          </p>
        </div>
      </FadeIn>

      {/* Controls */}
      <FadeIn delay={0.1}>
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={syncFromEmail}
                disabled={loading}
                className="btn-secondary"
                whileTap={{ scale: 0.98 }}
              >
                Sync from Email
              </motion.button>
              <motion.button
                onClick={syncFromCalendar}
                disabled={loading}
                className="btn-secondary"
                whileTap={{ scale: 0.98 }}
              >
                Sync from Calendar
              </motion.button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Contacts Grid */}
      <FadeIn delay={0.2}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.company && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {contact.company}
                      </p>
                    )}
                    {contact.title && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {contact.title}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <motion.button
                      onClick={() => setEditingContact(contact)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      whileHover={{ scale: 1.1 }}
                    >
                      ✏️
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {contact.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📧 {contact.email}
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📞 {contact.phone}
                    </p>
                  )}
                  {contact.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📝 {contact.notes}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {contact.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <motion.button
                    onClick={() => startChat(contact)}
                    className="flex-1 px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Chat
                  </motion.button>
                  <motion.button
                    onClick={() => sendEmail(contact)}
                    className="flex-1 px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Email
                  </motion.button>
                  <motion.button
                    onClick={() => setShowCreateLead(contact.id)}
                    className="flex-1 px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Create Lead
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </FadeIn>

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Contact</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateContact(editingContact.id, {
                firstName: formData.get("firstName") as string,
                lastName: formData.get("lastName") as string,
                email: formData.get("email") as string,
                phone: formData.get("phone") as string,
                company: formData.get("company") as string,
                title: formData.get("title") as string,
                notes: formData.get("notes") as string,
              });
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    name="firstName"
                    defaultValue={editingContact.firstName}
                    placeholder="First Name"
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                    required
                  />
                  <input
                    name="lastName"
                    defaultValue={editingContact.lastName}
                    placeholder="Last Name"
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                    required
                  />
                </div>
                <input
                  name="email"
                  defaultValue={editingContact.email || ""}
                  placeholder="Email"
                  type="email"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                />
                <input
                  name="phone"
                  defaultValue={editingContact.phone || ""}
                  placeholder="Phone"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                />
                <input
                  name="company"
                  defaultValue={editingContact.company || ""}
                  placeholder="Company"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                />
                <input
                  name="title"
                  defaultValue={editingContact.title || ""}
                  placeholder="Title"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                />
                <textarea
                  name="notes"
                  defaultValue={editingContact.notes || ""}
                  placeholder="Notes"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                  rows={3}
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Lead</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createLead(showCreateLead, {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                source: formData.get("source") as string,
                value: parseFloat(formData.get("value") as string) || undefined,
              });
            }}>
              <div className="space-y-4">
                <input
                  name="title"
                  placeholder="Lead Title"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                  required
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                  rows={3}
                />
                <input
                  name="source"
                  placeholder="Source"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                />
                <input
                  name="value"
                  placeholder="Value ($)"
                  type="number"
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateLead(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    Create
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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

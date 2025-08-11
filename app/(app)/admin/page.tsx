"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { THEMES, applyTheme, getInitialTheme } from '@/src/lib/ui/theme'
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion } from "framer-motion";

export const dynamic = "force-dynamic";

interface OrganizationStats {
  userCount: number;
  linkedAccounts: number;
  totalContacts: number;
  totalLeads: number;
  totalEvents: number;
}

interface ApiStatus {
  openai: boolean;
  google: boolean;
  database: boolean;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [sendEnabled, setSendEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setTheme] = useState<string>(getInitialTheme())

  const addToast = (message: string, type: "error" | "success" | "info" = "error") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsResponse, apiResponse, memoryResponse] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/status"),
        fetch("/api/memory?keys=settings:sendEnabled")
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setApiStatus(apiData);
      }

      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json();
        const sendEnabledMemory = memoryData.memories?.find((m: any) => m.key === "settings:sendEnabled");
        setSendEnabled(sendEnabledMemory?.value === "true");
      }
    } catch (error) {
      addToast("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const toggleSendEnabled = async () => {
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "settings:sendEnabled",
          value: (!sendEnabled).toString()
        })
      });

      if (response.ok) {
        setSendEnabled(!sendEnabled);
        addToast(`Email sending ${!sendEnabled ? "enabled" : "disabled"}`, "success");
      } else {
        addToast("Failed to update setting");
      }
    } catch (error) {
      addToast("Network error updating setting");
    }
  };

  const recalculateStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stats/recalc", { method: "POST" });
      if (response.ok) {
        addToast("Stats recalculated successfully", "success");
        fetchStats(); // Refresh stats
      } else {
        addToast("Failed to recalculate stats");
      }
    } catch (error) {
      addToast("Network error recalculating stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

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
          <h1 className="h1">Admin Dashboard</h1>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            System administration and monitoring
          </p>
        </div>
      </FadeIn>

      {/* Organization Summary */}
      <FadeIn delay={0.1}>
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="h2">Organization Summary</h2>
            <motion.button
              onClick={recalculateStats}
              disabled={loading}
              className="btn-secondary text-sm"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Recalculating..." : "Recalculate Stats"}
            </motion.button>
          </div>
          
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.userCount}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Users</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.linkedAccounts}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Linked Accounts</div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalContacts}</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Contacts</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalLeads}</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Leads</div>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalEvents}</div>
                <div className="text-sm text-indigo-600 dark:text-indigo-400">Events</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400 py-8">
              {loading ? "Loading stats..." : "No stats available"}
            </div>
          )}
        </div>
      </FadeIn>

      {/* API Status */}
      <FadeIn delay={0.2}>
        <div className="card mb-6">
          <h2 className="h2 mb-4">Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${
              apiStatus?.openai 
                ? "bg-green-50 dark:bg-green-900/20" 
                : "bg-red-50 dark:bg-red-900/20"
            }`}>
              <h3 className="font-medium text-gray-800 dark:text-white">OpenAI</h3>
              <p className={`text-sm ${
                apiStatus?.openai 
                  ? "text-green-600 dark:text-green-300" 
                  : "text-red-600 dark:text-red-300"
              }`}>
                {apiStatus?.openai ? "✅ Available" : "❌ Unavailable"}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              apiStatus?.google 
                ? "bg-green-50 dark:bg-green-900/20" 
                : "bg-red-50 dark:bg-red-900/20"
            }`}>
              <h3 className="font-medium text-gray-800 dark:text-white">Google APIs</h3>
              <p className={`text-sm ${
                apiStatus?.google 
                  ? "text-green-600 dark:text-green-300" 
                  : "text-red-600 dark:text-red-300"
              }`}>
                {apiStatus?.google ? "✅ Connected" : "❌ Disconnected"}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              apiStatus?.database 
                ? "bg-green-50 dark:bg-green-900/20" 
                : "bg-red-50 dark:bg-red-900/20"
            }`}>
              <h3 className="font-medium text-gray-800 dark:text-white">Database</h3>
              <p className={`text-sm ${
                apiStatus?.database 
                  ? "text-green-600 dark:text-green-300" 
                  : "text-red-600 dark:text-red-300"
              }`}>
                {apiStatus?.database ? "✅ Connected" : "❌ Disconnected"}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Settings */}
      <FadeIn delay={0.3}>
        <div className="card mb-6">
          <h2 className="h2 mb-4">System Settings</h2>
          <div className="space-y-4">
            {/* Theme selection */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">Theme</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Choose a color palette and gradient accents</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {THEMES.map(t => (
                  <button key={t.id} onClick={()=>{ setTheme(t.id); applyTheme(t.id as any) }} className={`p-3 rounded border text-left ${theme===t.id?'ring-2 ring-ring':''}`}>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="h-8 rounded mt-2" style={{ background: t.preview }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">Email Sending</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Allow automatic email sending (drafts are always allowed)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEnabled}
                  onChange={toggleSendEnabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* User Information */}
      <FadeIn delay={0.4}>
        <div className="card">
          <h2 className="h2 mb-4">User Information</h2>
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><strong>User ID:</strong> {session.user?.id}</div>
              <div><strong>Email:</strong> {session.user?.email}</div>
              <div><strong>Name:</strong> {session.user?.name}</div>
              <div><strong>Session Status:</strong> {status}</div>
            </div>
          </div>
        </div>
      </FadeIn>

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

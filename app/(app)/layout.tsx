"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import TransitionProvider from "./motion/TransitionProvider";
import AssistantDock from "@/components/AssistantDock";
import { applyTheme, getInitialTheme } from "@/lib/ui/theme";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Initialize theme
    const theme = getInitialTheme();
    applyTheme(theme);
  }, []);

  if (!isClient) {
    return (
      <SessionProvider>
        <div className="min-h-screen bg-surface-0">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-text">Loading...</div>
          </div>
        </div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-surface-0">
        <Sidebar />

        <div className="ml-64 transition-all duration-300">
          {/* Header */}
          <header className="bg-surface-50 dark:bg-surface-800 border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-text">Castra</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.open('/app/chat', '_blank')}
                    className="btn-ghost text-sm"
                    title="New Chat (N)"
                  >
                    💬 New Chat
                  </button>
                  <button
                    onClick={() => window.open('/app/inbox', '_blank')}
                    className="btn-ghost text-sm"
                    title="Inbox (G I)"
                  >
                    📧 Inbox
                  </button>
                  <button
                    onClick={() => window.open('/app/calendar', '_blank')}
                    className="btn-ghost text-sm"
                    title="Calendar (G C)"
                  >
                    📅 Calendar
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            <TransitionProvider>
              {children}
            </TransitionProvider>
          </main>
        </div>

        {/* Global Assistant Dock */}
        <AssistantDock />
      </div>
    </SessionProvider>
  );
}

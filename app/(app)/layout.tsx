"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import TransitionProvider from "./motion/TransitionProvider";
import AssistantDock from "@/components/AssistantDock";
import CommandPalette from "@/components/CommandPalette";
import { applyTheme, getInitialTheme } from "@/lib/ui/theme";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Initialize theme
    const theme = getInitialTheme();
    applyTheme(theme);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setIsCommandPaletteOpen(true);
            break;
          case 'n':
            e.preventDefault();
            window.open('/app/chat', '_blank');
            break;
        }
      }

      // G-prefix shortcuts (like Gmail)
      if (e.key === 'g' && e.metaKey) {
        e.preventDefault();
        // Wait for next key
        const handleNextKey = (e2: KeyboardEvent) => {
          document.removeEventListener('keydown', handleNextKey);
          switch (e2.key) {
            case 'i':
              window.open('/app/inbox', '_blank');
              break;
            case 'c':
              window.open('/app/calendar', '_blank');
              break;
            case 'd':
              window.open('/app/dashboard', '_blank');
              break;
          }
        };
        document.addEventListener('keydown', handleNextKey, { once: true });
      }

      // Slash to focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isClient) {
    return (
      <SessionProvider>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-foreground">Loading...</div>
          </div>
        </div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />

        <div className="ml-64 transition-all duration-300">
          {/* Header */}
          <header className="bg-card text-card-foreground border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-foreground">Castra</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search Button */}
                <button
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title="Search (⌘K or /)"
                >
                  <span>🔍</span>
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="hidden sm:inline text-xs bg-background px-1 rounded">
                    ⌘K
                  </kbd>
                </button>

                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.open('/app/chat', '_blank')}
                    className="btn-ghost text-sm"
                    title="New Chat (⌘N)"
                  >
                    💬 New Chat
                  </button>
                  <button
                    onClick={() => window.open('/app/inbox', '_blank')}
                    className="btn-ghost text-sm"
                    title="Inbox (⌘G I)"
                  >
                    📧 Inbox
                  </button>
                  <button
                    onClick={() => window.open('/app/calendar', '_blank')}
                    className="btn-ghost text-sm"
                    title="Calendar (⌘G C)"
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

        {/* Global Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </SessionProvider>
  );
}

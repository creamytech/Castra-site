"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TransitionProvider from "./motion/TransitionProvider";
import AssistantDock from "@/components/AssistantDock";
import CommandPalette from "@/components/CommandPalette";
import { UserMenu } from "@/components/user-menu";
import { FloatingThemeToggle } from "@/components/theme/floating-toggle";
import { applyTheme, getInitialTheme } from "@/lib/ui/theme";
import { CastraWordmark } from "@/components/brand/CastraWordmark";
import { ToastProvider } from "@/components/ui/ToastProvider";
import NotificationsBell from "@/components/NotificationsBell";
import dynamic from "next/dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
            window.open('/chat', '_blank');
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
              window.open('/dashboard/inbox', '_blank');
              break;
            case 'c':
              window.open('/calendar', '_blank');
              break;
            case 'd':
              window.open('/dashboard', '_blank');
              break;
          }
        };
        document.addEventListener('keydown', handleNextKey, { once: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-card border-r shadow-lg overflow-y-auto">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="md:ml-64 ml-0 transition-all duration-300">
        {/* Header */}
        <header className="bg-card text-card-foreground border-b border-border px-6 py-4 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile hamburger */}
              <button
                className="md:hidden mr-2 px-2 py-1 border rounded"
                aria-label="Open menu"
                onClick={() => setMobileSidebarOpen(true)}
              >
                ☰
              </button>
              <CastraWordmark size="md" />
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Search Button */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Search (⌘K)"
              >
                <span>🔍</span>
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline text-xs bg-background px-1 rounded">
                  ⌘K
                </kbd>
              </button>

              {/* Quick Actions */}
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={() => window.open('/chat', '_blank')}
                  className="btn-ghost text-sm"
                  title="New Chat (⌘N)"
                >
                  💬 New Chat
                </button>
                <button
                  onClick={() => window.open('/dashboard/inbox', '_blank')}
                  className="btn-ghost text-sm"
                  title="Inbox (⌘G I)"
                >
                  📧 Inbox
                </button>
                <button
                  onClick={() => window.open('/calendar', '_blank')}
                  className="btn-ghost text-sm"
                  title="Calendar (⌘G C)"
                >
                  📅 Calendar
                </button>
              </div>

              <NotificationsBell />
              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 sm:p-6">
          <TransitionProvider>
            {children}
          </TransitionProvider>
        </main>
      </div>

      {/* Floating Theme Toggle - Bottom Left */}
      <FloatingThemeToggle />

      {/* Global Assistant Dock */}
      <AssistantDock />

      {/* Global Agent Panel */}
      {isClient && <DynamicAgent />}

      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Floating Voice Widget */}
      {isClient && <DynamicVoice />}
    </div>
    </ToastProvider>
  );
}
const DynamicAgent = dynamic(() => import("@/components/agent/GlobalAgentPanel"), { ssr: false });

const DynamicVoice = dynamic(() => import("@/components/voice/FloatingVoiceWidget"), { ssr: false });

"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Stats {
  leadsNew: number;
  emailsToday: number;
  eventsUpcoming: number;
  draftsPending: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    leadsNew: 0,
    emailsToday: 0,
    eventsUpcoming: 0,
    draftsPending: 0
  });
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
      checkGoogleConnection();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        const googleConnected = data.accounts?.some((acc: any) => acc.provider === "google");
        setIsGoogleConnected(googleConnected);
        
        // If Google is connected, we can stay here. If not, redirect to connect
        if (!googleConnected) {
          router.push("/dashboard/connect");
        }
      }
    } catch (error) {
      console.error("Failed to check Google connection:", error);
    }
  };

  if (status === "loading" || loading) {
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
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Dashboard</h1>
        <p className="text-xl text-muted-foreground">
          Welcome to your Castra dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-3xl font-bold text-primary">{stats.leadsNew}</div>
          <div className="text-sm text-muted-foreground">New Leads (30d)</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-success">{stats.emailsToday}</div>
          <div className="text-sm text-muted-foreground">Emails Today</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-primary">{stats.eventsUpcoming}</div>
          <div className="text-sm text-muted-foreground">Upcoming Events</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-warning">{stats.draftsPending}</div>
          <div className="text-sm text-muted-foreground">Pending Drafts</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/chat"
              className="block w-full p-4 bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💬</div>
                <div>
                  <div className="font-medium text-foreground">Start AI Chat</div>
                  <div className="text-sm text-muted-foreground">Ask Castra anything</div>
                </div>
              </div>
            </Link>

            <Link
              href="/inbox"
              className="block w-full p-4 bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📧</div>
                <div>
                  <div className="font-medium text-foreground">Check Inbox</div>
                  <div className="text-sm text-muted-foreground">Review emails</div>
                </div>
              </div>
            </Link>

            <Link
              href="/calendar"
              className="block w-full p-4 bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📅</div>
                <div>
                  <div className="font-medium text-foreground">Schedule Meeting</div>
                  <div className="text-sm text-muted-foreground">Book appointments</div>
                </div>
              </div>
            </Link>

            <Link
              href="/crm"
              className="block w-full p-4 bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">👥</div>
                <div>
                  <div className="font-medium text-foreground">Add Lead</div>
                  <div className="text-sm text-muted-foreground">Create new contact</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div>
                <div className="font-medium text-foreground">New lead added</div>
                <div className="text-sm text-muted-foreground">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div>
                <div className="font-medium text-foreground">Email draft created</div>
                <div className="text-sm text-muted-foreground">4 hours ago</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div>
                <div className="font-medium text-foreground">Meeting scheduled</div>
                <div className="text-sm text-muted-foreground">1 day ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

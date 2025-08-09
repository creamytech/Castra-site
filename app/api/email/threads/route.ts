import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listRecentThreads } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const max = parseInt(searchParams.get("max") || "20");
    const q = searchParams.get("q") || "";

    try {
      const threads = await listRecentThreads(session.user.id, max);

      // Filter threads based on search query if provided
      let filteredThreads = threads;
      if (q) {
        const query = q.toLowerCase();
        filteredThreads = threads.filter(thread => {
          if (!thread.messages || thread.messages.length === 0) return false;
          
          const lastMessage = thread.messages[thread.messages.length - 1];
          const subject = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
          const from = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "from")?.value || "";
          const snippet = lastMessage.snippet || "";
          
          return subject.toLowerCase().includes(query) ||
                 from.toLowerCase().includes(query) ||
                 snippet.toLowerCase().includes(query);
        });
      }

      // Transform to the expected format
      const formattedThreads = filteredThreads.map(thread => {
        if (!thread.messages || thread.messages.length === 0) return null;
        
        const lastMessage = thread.messages[thread.messages.length - 1];
        const subject = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
        const from = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "from")?.value || "";
        
        // Handle dateISO property safely
        const dateISO = (lastMessage as any).dateISO || null;
        
        return {
          id: thread.id,
          threadId: thread.id,
          subject,
          sender: from,
          snippet: lastMessage.snippet,
          dateISO,
          labels: [] // Gmail labels would need additional API call
        };
      }).filter(Boolean);

      return NextResponse.json({ threads: formattedThreads });
    } catch (googleError: any) {
      console.error("[email-threads] Google API error:", googleError);
      
      // Check if it's an authentication error
      if (googleError.message?.includes("not connected") || googleError.message?.includes("no valid tokens")) {
        return NextResponse.json({ 
          error: "Google account not connected. Please connect your Google account to view emails.",
          threads: [],
          needsAuth: true
        }, { status: 401 });
      }
      
      // Check if it's a permission error
      if (googleError.message?.includes("access denied") || googleError.message?.includes("permission")) {
        return NextResponse.json({ 
          error: "Gmail access denied. Please check your Google account permissions.",
          threads: [],
          needsAuth: true
        }, { status: 403 });
      }
      
      // For other errors, return empty threads with error message
      return NextResponse.json({ 
        error: "Failed to fetch emails. Please try again later.",
        threads: [],
        retryable: true
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[email-threads] Unexpected error:", error);
    return NextResponse.json({ 
      error: "An unexpected error occurred while fetching emails.",
      threads: [],
      retryable: true
    }, { status: 500 });
  }
}

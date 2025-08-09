import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listRecentThreads, listUpcomingEvents } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get leads created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leadsNew = await prisma.lead.count({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Get emails from today (from Gmail)
    let emailsToday = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const threads = await listRecentThreads(userId, 50);
      emailsToday = threads.filter(thread => {
        if (thread.messages && thread.messages.length > 0) {
          const lastMessage = thread.messages[thread.messages.length - 1];
          if (lastMessage.dateISO) {
            const messageDate = new Date(lastMessage.dateISO);
            return messageDate >= today && messageDate < tomorrow;
          }
        }
        return false;
      }).length;
    } catch (error) {
      console.error("Failed to get email count:", error);
    }

    // Get upcoming calendar events (next 7 days)
    let eventsUpcoming = 0;
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const events = await listUpcomingEvents(userId, {
        max: 50,
        timeMinISO: new Date().toISOString()
      });

      eventsUpcoming = events.filter(event => {
        if (event.startISO) {
          const eventDate = new Date(event.startISO);
          return eventDate <= sevenDaysFromNow;
        }
        return false;
      }).length;
    } catch (error) {
      console.error("Failed to get event count:", error);
    }

    // Get pending drafts (this would require Gmail API to check drafts)
    let draftsPending = 0;
    try {
      // For now, we'll set this to 0 as it would require additional Gmail API calls
      // to fetch drafts. This could be implemented later if needed.
      draftsPending = 0;
    } catch (error) {
      console.error("Failed to get draft count:", error);
    }

    return NextResponse.json({
      leadsNew,
      emailsToday,
      eventsUpcoming,
      draftsPending
    });
  } catch (error) {
    console.error("[stats]", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listRecentThreads } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.toLowerCase();
    const results: any[] = [];

    // Search chat sessions
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId: session.user.id,
        title: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    chatSessions.forEach((session: any) => {
      results.push({
        id: session.id,
        type: "chat",
        title: session.title || "Untitled Chat",
        subtitle: `Created ${new Date(session.createdAt).toLocaleDateString()}`,
        url: `/app/chat?sessionId=${session.id}`,
        icon: "💬"
      });
    });

    // Search contacts
    const contacts = await prisma.contact.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { company: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

    contacts.forEach((contact: any) => {
      results.push({
        id: contact.id,
        type: "contact",
        title: `${contact.firstName} ${contact.lastName}`,
        subtitle: contact.email || contact.company || "No email/company",
        url: `/app/crm/${contact.id}`,
        icon: "👥"
      });
    });

    // Search leads
    const leads = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      include: { contact: true },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

    leads.forEach((lead: any) => {
      results.push({
        id: lead.id,
        type: "lead",
        title: lead.title,
        subtitle: `${lead.status} • ${lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName}` : 'No contact'}`,
        url: `/app/crm/leads/${lead.id}`,
        icon: "🎯"
      });
    });

    // Search email threads (using Gmail API)
    try {
      const emailThreads = await listRecentThreads(session.user.id, 20);
      const matchingThreads = emailThreads.filter(thread => {
        if (!thread.messages || thread.messages.length === 0) return false;
        
        const lastMessage = thread.messages[thread.messages.length - 1];
        const subject = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
        const from = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "from")?.value || "";
        const snippet = lastMessage.snippet || "";
        
        return subject.toLowerCase().includes(searchTerm) ||
               from.toLowerCase().includes(searchTerm) ||
               snippet.toLowerCase().includes(searchTerm);
      }).slice(0, 5);

      matchingThreads.forEach(thread => {
        if (!thread.messages || thread.messages.length === 0) return;
        
        const lastMessage = thread.messages[thread.messages.length - 1];
        const subject = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
        const from = lastMessage.payload?.headers?.find(h => h.name?.toLowerCase() === "from")?.value || "";
        
        results.push({
          id: thread.id,
          type: "email",
          title: subject || "No Subject",
          subtitle: `From: ${from}`,
          url: `/app/inbox?threadId=${thread.id}`,
          icon: "📧"
        });
      });
    } catch (error) {
      console.error("Email search failed:", error);
      // Continue without email results
    }

    // Search calendar events (placeholder - would need calendar API integration)
    // This is a placeholder for future implementation
    // const events = await searchCalendarEvents(session.user.id, searchTerm);
    // events.forEach(event => {
    //   results.push({
    //     id: event.id,
    //     type: "event",
    //     title: event.summary,
    //     subtitle: event.start?.dateTime || event.start?.date,
    //     url: `/app/calendar?eventId=${event.id}`,
    //     icon: "📅"
    //   });
    // });

    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === searchTerm;
      const bExact = b.title.toLowerCase() === searchTerm;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return 0;
    });

    return NextResponse.json({ 
      results: results.slice(0, 20) // Limit to 20 results total
    });

  } catch (error) {
    console.error("[search]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

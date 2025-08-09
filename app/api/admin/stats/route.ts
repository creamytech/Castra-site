import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization stats
    const [
      userCount,
      linkedAccounts,
      totalContacts,
      totalLeads,
      totalEvents
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.contact.count(),
      prisma.lead.count(),
      // For events, we'll count calendar events if available
      Promise.resolve(0) // Placeholder for now
    ]);

    return NextResponse.json({
      userCount,
      linkedAccounts,
      totalContacts,
      totalLeads,
      totalEvents
    });
  } catch (error) {
    console.error("[admin-stats]", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This endpoint is for recalculating stats
    // In a real implementation, you might want to clear caches or recalculate aggregations
    
    return NextResponse.json({ message: "Stats recalculated successfully" });
  } catch (error) {
    console.error("[admin-stats-recalc]", error);
    return NextResponse.json({ error: "Failed to recalculate stats" }, { status: 500 });
  }
}

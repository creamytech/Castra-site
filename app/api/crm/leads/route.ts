import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, invalidate } from "@/lib/cache";
import { recordCache } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, source, value, contactId } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        userId: session.user.id,
        title,
        description,
        source,
        value,
        contactId
      },
      include: {
        contact: true
      }
    });

    // Invalidate lead list caches for this user
    await invalidate(`leads:v1:${session.user.id}:*`);

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[crm-lead-create]", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const stage = url.searchParams.get('stage') || undefined;
    const q = url.searchParams.get('q') || undefined;
    const key = `leads:v1:${session.user.id}:${JSON.stringify({ stage, q })}:${page}`;
    const cached = await cacheGet<any>(key);
    if (cached) { recordCache(true); return NextResponse.json({ leads: cached, cached: true }); }
    recordCache(false);

    const where: any = { userId: session.user.id };
    if (stage) where.status = stage;
    if (q) where.title = { contains: q, mode: 'insensitive' };

    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      skip: page * 20,
    });
    await cacheSet(key, leads, 300);

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[crm-leads]", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

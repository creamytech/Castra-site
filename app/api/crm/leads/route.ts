import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const leads = await prisma.lead.findMany({
      where: { userId: session.user.id },
      include: {
        contact: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[crm-leads]", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

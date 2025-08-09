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

    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const memory = await prisma.memory.upsert({
      where: {
        userId_key: {
          userId: session.user.id,
          key
        }
      },
      update: {
        value
      },
      create: {
        userId: session.user.id,
        key,
        value
      }
    });

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("[memory]", error);
    return NextResponse.json({ error: "Failed to set memory" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keys = searchParams.get("keys");

    if (keys) {
      const keyArray = keys.split(",");
      const memories = await prisma.memory.findMany({
        where: {
          userId: session.user.id,
          key: { in: keyArray }
        }
      });
      return NextResponse.json({ memories });
    } else {
      const memories = await prisma.memory.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" }
      });
      return NextResponse.json({ memories });
    }
  } catch (error) {
    console.error("[memory]", error);
    return NextResponse.json({ error: "Failed to get memories" }, { status: 500 });
  }
}

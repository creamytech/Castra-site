import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = withAuth(async ({ req, ctx }) => {
  try {

    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const memory = await prisma.memory.upsert({
      where: {
        userId_key: {
          userId: ctx.session.user.id,
          key
        }
      },
      update: {
        value
      },
      create: {
        userId: ctx.session.user.id,
        key,
        value
      }
    });

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("[memory]", error);
    return NextResponse.json({ error: "Failed to set memory" }, { status: 500 });
  }
}, { action: 'memory.set' })

export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url);
    const keys = searchParams.get("keys");

    if (keys) {
      const keyArray = keys.split(",");
      const memories = await prisma.memory.findMany({ where: { userId: ctx.session.user.id, key: { in: keyArray } } });
      return NextResponse.json({ memories });
    } else {
      const memories = await prisma.memory.findMany({ where: { userId: ctx.session.user.id }, orderBy: { updatedAt: "desc" } });
      return NextResponse.json({ memories });
    }
  } catch (error) {
    console.error("[memory]", error);
    return NextResponse.json({ error: "Failed to get memories" }, { status: 500 });
  }
}, { action: 'memory.get' })

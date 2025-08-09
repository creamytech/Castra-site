import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check OpenAI status
    let openaiStatus = false;
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      // Try a simple API call
      await openai.models.list();
      openaiStatus = true;
    } catch (error) {
      console.error("OpenAI status check failed:", error);
      openaiStatus = false;
    }

    // Check Google APIs status
    let googleStatus = false;
    try {
      // Check if Google account is connected for the user
      const googleAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: "google"
        }
      });
      googleStatus = !!googleAccount;
    } catch (error) {
      console.error("Google status check failed:", error);
      googleStatus = false;
    }

    // Check database status
    let databaseStatus = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = true;
    } catch (error) {
      console.error("Database status check failed:", error);
      databaseStatus = false;
    }

    return NextResponse.json({
      openai: openaiStatus,
      google: googleStatus,
      database: databaseStatus
    });
  } catch (error) {
    console.error("[admin-status]", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { provider } = await request.json();

    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { error: "Provider is required and must be a string" },
        { status: 400 }
      );
    }

    // Delete the account for the specified provider
    const deletedAccount = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: provider
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Successfully disconnected ${provider} account`,
      deletedCount: deletedAccount.count
    });
  } catch (error: any) {
    console.error("Disconnect API error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to disconnect account",
        details: "Check database connection and account existence"
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/securePrisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accounts = await prisma.mailAccount.findMany({
      where: {
        userId: session.user.id
      },
      select: { id: true, provider: true, providerUserId: true }
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error("Accounts API error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch accounts",
        details: "Check database connection and user authentication"
      },
      { status: 500 }
    );
  }
}

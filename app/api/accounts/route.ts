import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/securePrisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ ctx }) => {
  try {
    const accounts = await prisma.mailAccount.findMany({
      where: { userId: ctx.session.user.id },
      select: { id: true, provider: true, providerUserId: true }
    })
    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error("Accounts API error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 })
  }
}, { action: 'accounts.list' })

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/securePrisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ ctx }) => {
  try {
    let accounts = await prisma.mailAccount.findMany({
      where: { userId: ctx.session.user.id },
      select: { id: true, provider: true, providerUserId: true }
    })
    // Fallback: if no MailAccount but NextAuth Account exists, create a MailAccount on the fly
    if (!accounts.length) {
      try {
        const adapterAccounts = await (prisma as any).account.findMany({ where: { userId: ctx.session.user.id, provider: 'google' }, select: { providerAccountId: true, refresh_token: true } })
        for (const a of adapterAccounts) {
          if (!a.providerAccountId) continue
          const refreshBuf = Buffer.alloc(0)
          await prisma.mailAccount.upsert({
            where: { providerUserId: a.providerAccountId },
            create: { userId: ctx.session.user.id, provider: 'google', providerUserId: a.providerAccountId, refreshTokenEnc: refreshBuf },
            update: { userId: ctx.session.user.id }
          })
        }
        // Fetch via SECURITY DEFINER function to avoid any RLS context issues
        const viaFn: any[] = await (prisma as any).$queryRawUnsafe('SELECT * FROM app.get_mail_accounts($1)', ctx.session.user.id)
        if (viaFn?.length) accounts = viaFn as any
      } catch {}
    }
    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error("Accounts API error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 })
  }
}, { action: 'accounts.list' })

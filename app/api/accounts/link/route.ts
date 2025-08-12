import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'
import { encryptRefreshToken } from '@/lib/token'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }) => {
  try {
    // Bridge NextAuth Account -> MailAccount for Google
    // Use secure client to write; NextAuth tables are accessible without RLS
    const accounts = await (prisma as any).account.findMany({ where: { userId: ctx.session.user.id, provider: 'google' }, select: { providerAccountId: true, refresh_token: true } })
    let created = 0
    for (const a of accounts) {
      if (!a.providerAccountId) continue
      // Call DB function with SECURITY DEFINER to bypass RLS if needed
      try {
        await prisma.$executeRawUnsafe(`SELECT app.link_mail_account($1, $2, $3)`, ctx.session.user.id, 'google', a.providerAccountId)
      } catch {
        // Fallback to app-side upsert under current session
        const enc = a.refresh_token ? await encryptRefreshToken(a.refresh_token) : Buffer.alloc(0)
        await prisma.mailAccount.upsert({
          where: { providerUserId: a.providerAccountId },
          create: { userId: ctx.session.user.id, provider: 'google', providerUserId: a.providerAccountId, refreshTokenEnc: enc },
          update: { userId: ctx.session.user.id, refreshTokenEnc: enc }
        })
      }
      created++
    }
    return NextResponse.json({ ok: true, linked: created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed', detail: e?.meta || null }, { status: 500 })
  }
}, { action: 'accounts.link' })



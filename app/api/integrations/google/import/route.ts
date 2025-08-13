import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRLS } from '@/lib/rls'
import { prisma } from '@/lib/prisma'
import { encryptRefreshToken } from '@/lib/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }) => {
  try {
    const adapter = await prisma.account.findFirst({ where: { userId: ctx.session.user.id, provider: 'google' }, select: { providerAccountId: true, refresh_token: true, access_token: true } })
    if (!adapter?.refresh_token) return NextResponse.json({ ok: false, reason: 'no-adapter-refresh' }, { status: 400 })

    const enc = await encryptRefreshToken(adapter.refresh_token)
    await withRLS(ctx.session.user.id, async (tx) => {
      const providerUserId = adapter.providerAccountId || ctx.session.user.id
      // Ensure MailAccount exists by unique key on providerUserId
      const existing = await (tx as any).mailAccount.findFirst({ where: { provider: 'google', providerUserId } })
      if (existing) {
        await (tx as any).mailAccount.update({ where: { id: existing.id }, data: { userId: ctx.session.user.id, refreshTokenEnc: enc } })
      } else {
        await (tx as any).mailAccount.create({ data: { userId: ctx.session.user.id, provider: 'google', providerUserId, refreshTokenEnc: enc } })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'integrations.google.import' })



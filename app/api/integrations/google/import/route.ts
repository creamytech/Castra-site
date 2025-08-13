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
    const adapter = await prisma.account.findFirst({ where: { userId: ctx.session.user.id, provider: 'google' }, select: { providerAccountId: true, refresh_token: true } })
    if (!adapter?.refresh_token) return NextResponse.json({ ok: false, reason: 'no-adapter-refresh' }, { status: 400 })

    const enc = await encryptRefreshToken(adapter.refresh_token)
    await withRLS(ctx.session.user.id, async (tx) => {
      await (tx as any).mailAccount.upsert({
        where: { providerUserId: adapter.providerAccountId || '' },
        create: { userId: ctx.session.user.id, provider: 'google', providerUserId: adapter.providerAccountId || ctx.session.user.id, refreshTokenEnc: enc },
        update: { userId: ctx.session.user.id, refreshTokenEnc: enc }
      })
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'integrations.google.import' })



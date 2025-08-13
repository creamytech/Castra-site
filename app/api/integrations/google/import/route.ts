import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRLS } from '@/lib/rls'
import { prisma } from '@/lib/prisma'
import { encryptRefreshToken } from '@/lib/token'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false, reason: 'no-session' }, { status: 401 })

  try {
    // Read NextAuth adapter Account row
    const adapter = await prisma.account.findFirst({ where: { userId: session.user.id, provider: 'google' }, select: { providerAccountId: true, refresh_token: true } })
    if (!adapter?.refresh_token) return NextResponse.json({ ok: false, reason: 'no-adapter-refresh' }, { status: 400 })

    const enc = await encryptRefreshToken(adapter.refresh_token)
    await withRLS(session.user.id, async (tx) => {
      // Ensure MailAccount exists and update encrypted token
      await (tx as any).mailAccount.upsert({
        where: { providerUserId: adapter.providerAccountId || '' },
        create: { userId: session.user.id, provider: 'google', providerUserId: adapter.providerAccountId || session.user.id, refreshTokenEnc: enc },
        update: { userId: session.user.id, refreshTokenEnc: enc }
      })
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}



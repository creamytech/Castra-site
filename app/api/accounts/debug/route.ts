import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  try {
    const adapterAccounts = await (prisma as any).account.findMany({
      where: { userId: ctx.session.user.id },
      select: { id: true, provider: true, providerAccountId: true, access_token: true, refresh_token: true, expires_at: true }
    })
    const mailAccounts = await prisma.mailAccount.findMany({ where: { userId: ctx.session.user.id }, select: { id: true, provider: true, providerUserId: true } })
    return NextResponse.json({ adapterAccounts, mailAccounts })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'accounts.debug' })



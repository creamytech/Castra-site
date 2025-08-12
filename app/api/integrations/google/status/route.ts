import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'
import { withRLS } from '@/lib/rls'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  try {
    const result = await withRLS(ctx.session.user.id, async (tx) => {
      const account = await (tx as any).mailAccount.findFirst({ where: { userId: ctx.session.user.id, provider: 'google' } })
      if (!account) return { connected: false, reason: 'no-account' }
      let mailbox = await (tx as any).mailbox.findFirst({ where: { accountId: account.id } })
      if (!mailbox) {
        // Auto-create a mailbox with the signed-in user's email (fallback empty)
        mailbox = await (tx as any).mailbox.create({ data: { accountId: account.id, email: ctx.session.user.email || '' } })
      }
      const hasRT = Buffer.isBuffer(account.refreshTokenEnc) ? account.refreshTokenEnc.length > 0 : !!account.refreshTokenEnc
      if (!hasRT) return { connected: false, reason: 'no-refresh-token' }
      return { connected: true, accountId: account.id, mailboxId: mailbox.id }
    })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ connected: false, reason: 'error', error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'integrations.google.status' })



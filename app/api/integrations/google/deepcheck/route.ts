import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { withRLS } from '@/lib/rls'
import { decryptRefreshToken } from '@/lib/token'
import { prisma as adapterPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
	try {
		const result = await withRLS(ctx.session.user.id, async (tx) => {
            const account = await (tx as any).mailAccount.findFirst({ where: { userId: ctx.session.user.id, provider: 'google' }, select: { id: true, refreshTokenEnc: true } })
			const mailbox = account ? await (tx as any).mailbox.findFirst({ where: { accountId: account.id }, select: { id: true, email: true } }) : null

			const rtBytes = account?.refreshTokenEnc && Buffer.isBuffer(account.refreshTokenEnc) ? (account.refreshTokenEnc as Buffer).length : 0
			let rtProbe: string | null = null
			try {
				if (account?.refreshTokenEnc && Buffer.isBuffer(account.refreshTokenEnc) && account.refreshTokenEnc.length > 0) {
					const plain = await decryptRefreshToken(account.refreshTokenEnc as Buffer)
					rtProbe = `LEN:${plain.length}`
				} else {
					rtProbe = null
				}
			} catch (e: any) {
				rtProbe = `DECRYPT_FAIL:${String(e?.message || e)}`
			}

            const adapter = await adapterPrisma.account.findFirst({ where: { userId: ctx.session.user.id, provider: 'google' }, select: { providerAccountId: true, access_token: true, refresh_token: true, expires_at: true } })

			return {
				ok: true,
				userId: ctx.session.user.id,
				hasAccount: !!account,
				hasMailbox: !!mailbox,
				refreshTokenBytes: rtBytes,
				refreshTokenProbe: rtProbe,
                adapter: {
                    hasAccess: !!adapter?.access_token,
                    hasRefresh: !!adapter?.refresh_token,
                    providerAccountId: adapter?.providerAccountId || null,
                    expiresAt: adapter?.expires_at || null,
                }
			}
		})
		return NextResponse.json(result)
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
	}
}, { action: 'integrations.google.deepcheck' })




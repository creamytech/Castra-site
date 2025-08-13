import { withRLS } from '@/lib/rls'
import { prisma } from '@/lib/securePrisma'
import { decryptBytesToString } from '@/lib/secure-fields'

export async function getUserGoogleRefreshToken(userId: string): Promise<string | null> {
	return withRLS(userId, async (tx) => {
		const acc = await (tx as any).mailAccount.findFirst({ where: { userId, provider: 'google' }, select: { refreshTokenEnc: true } })
		if (!acc?.refreshTokenEnc) return null
		return await decryptBytesToString(acc.refreshTokenEnc as any)
	})
}




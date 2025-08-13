import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRLS } from '@/lib/rls'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false, reason: 'no-session' }, { status: 401 })

  const data = await withRLS(session.user.id, async (tx) => {
    const member = await (tx as any).orgMember.findFirst({ where: { userId: session.user!.id } })
    const orgId = member?.orgId || null
    const acc = await (tx as any).mailAccount.findFirst({ where: { userId: session.user.id, provider: 'google' } })

    return {
      ok: true,
      userId: session.user.id,
      orgId,
      hasMembership: !!member,
      hasGoogleAccount: !!acc,
      rtBytes: acc?.refreshTokenEnc ? (acc.refreshTokenEnc as Buffer).length : 0,
    }
  })

  return NextResponse.json(data)
}



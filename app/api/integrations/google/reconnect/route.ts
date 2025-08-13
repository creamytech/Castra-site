import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRLS } from '@/lib/rls'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false, reason: 'no-session' }, { status: 401 })

  await withRLS(session.user.id, async (tx) => {
    const acc = await (tx as any).mailAccount.findFirst({ where: { userId: session.user.id, provider: 'google' }, select: { id: true } })
    if (acc) {
      await (tx as any).mailAccount.update({ where: { id: acc.id }, data: { refreshTokenEnc: Buffer.alloc(0) } })
    }
  })

  return NextResponse.json({ ok: true })
}



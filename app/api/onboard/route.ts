import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRLS } from '@/lib/rls'
import { ensureOrgAndMembership } from '@/lib/org/ensure'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false, reason: 'no-session' }, { status: 401 })

  await withRLS(session.user.id, async (tx) => ensureOrgAndMembership(tx as any, session.user!.id))
  return NextResponse.json({ ok: true })
}



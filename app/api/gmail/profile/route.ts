import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProfile } from '@/lib/google/gmailLayer'
import { prisma } from '@/lib/prisma'
import { getPrimaryEmail } from '@/lib/google/people'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getProfile(session.user.id)
  const email = await getPrimaryEmail(session.user.id)
  if (email) {
    await prisma.account.updateMany({ where: { userId: session.user.id, provider: 'google' }, data: { gmailEmailAddress: email } })
  }
  return NextResponse.json({ profile, email })
}



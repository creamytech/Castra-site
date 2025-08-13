import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const account = await prisma.account.findFirst({ where: { userId: session.user.id, provider: 'google' } })
  const mail = await prisma.mailAccount.findFirst({ where: { userId: session.user.id, provider: 'google' } })
  return NextResponse.json({
    email: account?.gmailEmailAddress || session.user.email || null,
    lastSync: null,
    hasRefresh: !!mail?.refreshTokenEnc && (mail.refreshTokenEnc as any).length > 0,
  })
}



import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }) => {
  const userId = ctx.session.user.id
  // Delete user mail rows and blobs; cascade removes children due to FK
  const accounts = await prisma.mailAccount.findMany({ where: { userId }, select: { id: true } })
  for (const acc of accounts) {
    await prisma.mailAccount.delete({ where: { id: acc.id } })
  }
  return NextResponse.json({ ok: true })
}, { action: 'delete.data' })



import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { status } = await req.json()
    const ok = await prisma.emailThread.update({ where: { id: params.id }, data: { status } })
    return NextResponse.json({ ok: true, thread: ok })
  } catch (e: any) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}, { action: 'inbox.thread.status' })



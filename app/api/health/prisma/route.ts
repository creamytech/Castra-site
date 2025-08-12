import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const n = await prisma.userProfile.count()
    return NextResponse.json({ ok: true, userProfiles: n })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'prisma error' }, { status: 500 })
  }
}



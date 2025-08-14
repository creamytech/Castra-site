export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isFeatureEnabled } from '@/lib/config'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    const base: any = {
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      },
      config: {
        gmail: isFeatureEnabled('gmail'),
        calendar: isFeatureEnabled('calendar'),
      },
      session: { userId: session?.user?.id, email: session?.user?.email },
    }

    if (!session?.user?.id) return NextResponse.json({ ...base, note: 'No session' }, { status: 401 })

    return NextResponse.json({ ...base, note: 'Google disabled' }, { status: 410 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 })
  }
}

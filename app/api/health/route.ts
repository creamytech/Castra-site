import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateRequiredEnvVars, getAuthProviders, isFeatureEnabled } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const [prismaOk, threads, messages, deals] = await Promise.all([
      prisma.userProfile.count().then(()=>true).catch(()=>false),
      userId ? prisma.emailThread.count({ where: { userId } }) : Promise.resolve(0),
      userId ? prisma.emailMessage.count({ where: { userId } }) : Promise.resolve(0),
      userId ? prisma.deal.count({ where: { userId } }) : Promise.resolve(0),
    ])

    const errors = validateRequiredEnvVars()
    const authProviders = getAuthProviders()

    const health = {
      status: errors.length === 0 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        gmail: isFeatureEnabled('gmail'),
        calendar: isFeatureEnabled('calendar'),
        crm: isFeatureEnabled('crm'),
      },
      auth: {
        providers: authProviders,
        configured: authProviders.length > 0,
      },
      counts: { threads, messages, deals },
      prismaOk,
      userId,
      errors: errors.length > 0 ? errors : undefined,
    }

    return NextResponse.json(health, { status: errors.length === 0 ? 200 : 503 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGoogleClientsForUser } from '@/lib/google/getClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    // Check Google
    let hasGoogleToken = false
    let gmailThreadsCount = 0
    let calendarNext3: any[] = []
    try {
      const acct = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
      hasGoogleToken = !!acct?.access_token
      if (hasGoogleToken) {
        const { calendar } = await getGoogleClientsForUser(userId)
        const cal = await calendar.events.list({ calendarId: 'primary', maxResults: 3, singleEvents: true, orderBy: 'startTime', timeMin: new Date().toISOString() })
        calendarNext3 = (cal.data.items || []).map(i => ({ summary: i.summary, start: i.start, end: i.end }))
      }
    } catch {}

    const deals = await (prisma as any).deal.groupBy({ by: ['stage'], where: { userId }, _count: { _all: true } })
    const dealCounts: Record<string, number> = {}
    for (const d of deals) dealCounts[d.stage] = d._count._all

    const threadsCount = await prisma.emailThread.count({ where: { userId } })
    const messagesCount = await prisma.emailMessage.count({ where: { userId } })
    gmailThreadsCount = threadsCount

    return NextResponse.json({ userId, hasGoogleToken, gmailThreadsCount, calendarNext3, deals: dealCounts, inboxCounts: { threads: threadsCount, messages: messagesCount } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}



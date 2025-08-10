import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const unreadCount = await prisma.notification.count({ where: { userId: session.user.id, readAt: null } })

    return NextResponse.json({ success: true, notifications, unreadCount })
  } catch (e: any) {
    console.error('[notifications GET]', e)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ids } = await request.json().catch(() => ({}))
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids[] required' }, { status: 400 })

    await prisma.notification.updateMany({ where: { userId: session.user.id, id: { in: ids } }, data: { readAt: new Date() } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[notifications PATCH]', e)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    const notifications = await prisma.notification.findMany({
      where: { userId: ctx.session.user.id, orgId: ctx.orgId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const unreadCount = await prisma.notification.count({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, readAt: null } })

    return NextResponse.json({ success: true, notifications, unreadCount })
  } catch (e: any) {
    console.error('[notifications GET]', e)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}, { action: 'notifications.list' })

export const PATCH = withAuth(async ({ req, ctx }) => {
  try {

    const { ids } = await req.json().catch(() => ({}))
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids[] required' }, { status: 400 })

    await prisma.notification.updateMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, id: { in: ids } }, data: { readAt: new Date() } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[notifications PATCH]', e)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}, { action: 'notifications.read' })

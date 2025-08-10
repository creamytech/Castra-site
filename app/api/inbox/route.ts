import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRecentThreads, getThreadDetail } from '@/lib/google'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const maxResults = parseInt(searchParams.get('maxResults') || '10')
    const threadId = searchParams.get('threadId')

    if (threadId) {
      // Get specific thread details
      const thread = await getThreadDetail(session.user.id, threadId)
      return NextResponse.json({ thread })
    } else {
      // List recent threads
      const threads = await listRecentThreads(session.user.id, maxResults)
      return NextResponse.json({ threads })
    }
  } catch (error) {
    console.error('Inbox API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check if Google account is connected and tokens are valid'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, ids, label } = await request.json().catch(() => ({}))
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids[] required' }, { status: 400 })

    const where = { id: { in: ids as string[] }, userId: session.user.id }

    switch (action) {
      case 'read':
        await prisma.message.updateMany({ where, data: { labels: { set: [] } } })
        break
      case 'unread':
        await prisma.message.updateMany({ where, data: { labels: { set: ['UNREAD'] } } })
        break
      case 'delete':
        // soft delete by adding TRASH label
        const msgs = await prisma.message.findMany({ where })
        for (const m of msgs) {
          const next = Array.from(new Set([...(m.labels || []), 'TRASH']))
          await prisma.message.update({ where: { id: m.id }, data: { labels: next } })
        }
        break
      case 'label':
        if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })
        const ms = await prisma.message.findMany({ where })
        for (const m of ms) {
          const next = Array.from(new Set([...(m.labels || []), String(label).toUpperCase()]))
          await prisma.message.update({ where: { id: m.id }, data: { labels: next } })
        }
        break
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[inbox PATCH]', e)
    return NextResponse.json({ error: 'Failed to update inbox' }, { status: 500 })
  }
}

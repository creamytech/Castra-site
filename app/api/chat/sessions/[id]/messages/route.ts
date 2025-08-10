import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {

    // Verify session belongs to user
    const chatSession = await prisma.chatSession.findFirst({ where: { id: params.id, userId: ctx.session.user.id } })

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get messages for this session
    const messages = await prisma.chatMessage.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } })

    return NextResponse.json({
      success: true,
      messages,
      session: chatSession
    })

  } catch (error: any) {
    console.error('[chat-session-messages]', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}, { action: 'chat.messages' })

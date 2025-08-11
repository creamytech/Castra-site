import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSessionSchema = z.object({
  title: z.string().optional().default("Draft...")
})

export const POST = withAuth(async ({ req, ctx }) => {
  try {

    const body = await req.json()
    const validationResult = CreateSessionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { title } = validationResult.data

    // Create new chat session
    const newSession = await prisma.chatSession.create({ data: { userId: ctx.session.user.id, title } })

    return NextResponse.json({
      success: true,
      session: newSession
    })

  } catch (error: any) {
    console.error('[chat-session-create]', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}, { action: 'chat.sessions.create' })

export const GET = withAuth(async ({ ctx }) => {
  try {

    // Get user's chat sessions
    const sessions = await prisma.chatSession.findMany({ where: { userId: ctx.session.user.id }, orderBy: { createdAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } })

    return NextResponse.json({
      success: true,
      sessions
    })

  } catch (error: any) {
    console.error('[chat-sessions-list]', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}, { action: 'chat.sessions.list' })

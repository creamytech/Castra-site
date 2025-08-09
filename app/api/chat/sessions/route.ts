import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSessionSchema = z.object({
  title: z.string().optional().default("Draft...")
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = CreateSessionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { title } = validationResult.data

    // Create new chat session
    const newSession = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        title
      }
    })

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
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's chat sessions
    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

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
}

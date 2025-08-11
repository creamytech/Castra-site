import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const RenameSessionSchema = z.object({
  title: z.string().min(1, "Title must be at least 1 character")
})

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ ctx }, { params }: any) => {
  try {

    const chatSession = await prisma.chatSession.findFirst({ where: { id: params.id, userId: ctx.session.user.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });

    if (!chatSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: chatSession });
  } catch (error) {
    console.error("[chat-session]", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}, { action: 'chat.session.get' })

export const PATCH = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const body = await req.json().catch(() => ({}))
    const validationResult = RenameSessionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { title } = validationResult.data

    // Check if session exists and belongs to user
    const existingSession = await prisma.chatSession.findFirst({ where: { id: params.id, userId: ctx.session.user.id } })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update the session title
    const updatedSession = await prisma.chatSession.update({ where: { id: params.id }, data: { title } })

    return NextResponse.json({
      success: true,
      session: updatedSession
    })

  } catch (error: any) {
    console.error('[chat-session-rename]', error)
    return NextResponse.json(
      { error: 'Failed to rename session' },
      { status: 500 }
    )
  }
}, { action: 'chat.session.rename' })

export const DELETE = withAuth(async ({ ctx }, { params }: any) => {
  try {
    // Check if session exists and belongs to user
    const existingSession = await prisma.chatSession.findFirst({ where: { id: params.id, userId: ctx.session.user.id } })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Delete the session and all its messages
    await prisma.chatSession.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[chat-session-delete]', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}, { action: 'chat.session.delete' })

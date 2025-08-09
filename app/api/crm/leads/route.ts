import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    const leads = await prisma.lead.findMany({
      where: { userId: session.user.id },
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { contactId, source, status, notes, title } = await request.json()

    if (!contactId || !source || !title) {
      return NextResponse.json(
        { error: 'Contact ID, source, and title are required' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.create({
      data: {
        userId: session.user.id,
        contactId,
        title,
        source,
        status: status || 'new',
        notes,
      },
      include: { contact: true },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Failed to create lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

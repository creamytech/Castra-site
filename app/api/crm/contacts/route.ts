import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contacts = await prisma.contact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
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

    const { firstName, lastName, email, phone, tags } = await request.json()

    if (!firstName || !email) {
      return NextResponse.json(
        { error: 'First name and email are required' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.create({
      data: {
        userId: session.user.id,
        firstName,
        lastName,
        email,
        phone,
        tags: tags || [],
      },
    })

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Failed to create contact:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

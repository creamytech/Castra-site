import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { status, notes, tags } = await req.json()
    const contactId = params.id

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Update contact with user scoping
    const updatedContact = await prisma.contact.update({
      where: {
        id: contactId,
        userId: session.user.id // Ensure user can only update their own contacts
      },
      data: {
        notes: notes || '',
        tags: tags || []
      }
    })

    return NextResponse.json({ contact: updatedContact })
  } catch (error: any) {
    console.error('CRM update contact error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to update contact' }, 
      { status: 500 }
    )
  }
}

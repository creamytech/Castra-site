import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { status, notes, tags } = await req.json()
    const contactId = params.id

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // In a real implementation, you would update the database
    // For now, return success response
    const updatedContact = {
      id: contactId,
      status: status || 'new',
      notes: notes || '',
      tags: tags || [],
      lastContact: new Date().toISOString()
    }

    return NextResponse.json({ contact: updatedContact })
  } catch (error: any) {
    console.error('CRM update contact error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to update contact' }, 
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock data for demonstration
const mockContacts = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    source: 'website',
    tags: ['buyer', 'first-time'],
    lastContact: '2024-01-15T10:30:00Z',
    emailCount: 5,
    meetingCount: 2,
    leadScore: 85,
    status: 'showing' as const,
    notes: 'Interested in 3-bedroom homes in downtown area',
    createdAt: '2024-01-10T09:00:00Z'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '(555) 987-6543',
    source: 'referral',
    tags: ['seller', 'urgent'],
    lastContact: '2024-01-14T14:00:00Z',
    emailCount: 8,
    meetingCount: 3,
    leadScore: 92,
    status: 'offer' as const,
    notes: 'Selling family home, needs to close by March',
    createdAt: '2024-01-08T11:30:00Z'
  },
  {
    id: '3',
    name: 'Mike Wilson',
    email: 'mike.wilson@example.com',
    phone: '(555) 456-7890',
    source: 'social',
    tags: ['buyer', 'investor'],
    lastContact: '2024-01-12T16:45:00Z',
    emailCount: 3,
    meetingCount: 1,
    leadScore: 45,
    status: 'contacted' as const,
    notes: 'Looking for investment properties',
    createdAt: '2024-01-05T13:15:00Z'
  },
  {
    id: '4',
    name: 'Lisa Chen',
    email: 'lisa.chen@example.com',
    phone: '(555) 321-0987',
    source: 'email',
    tags: ['buyer', 'luxury'],
    lastContact: '2024-01-13T09:15:00Z',
    emailCount: 12,
    meetingCount: 4,
    leadScore: 78,
    status: 'showing' as const,
    notes: 'Interested in luxury properties over $1M',
    createdAt: '2024-01-03T10:45:00Z'
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'david.brown@example.com',
    phone: '(555) 654-3210',
    source: 'calendar',
    tags: ['seller', 'relocation'],
    lastContact: '2024-01-11T11:00:00Z',
    emailCount: 6,
    meetingCount: 2,
    leadScore: 65,
    status: 'new' as const,
    notes: 'Relocating for job, needs to sell quickly',
    createdAt: '2024-01-09T15:30:00Z'
  }
]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // In a real implementation, you would fetch from database
    // For now, return mock data
    return NextResponse.json({ contacts: mockContacts })
  } catch (error: any) {
    console.error('CRM contacts error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch contacts' }, 
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, email, phone, source, tags } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // In a real implementation, you would save to database
    const newContact = {
      id: Date.now().toString(),
      name,
      email,
      phone: phone || '',
      source: source || 'other',
      tags: tags || [],
      lastContact: new Date().toISOString(),
      emailCount: 0,
      meetingCount: 0,
      leadScore: 25, // Default score for new contacts
      status: 'new' as const,
      notes: '',
      createdAt: new Date().toISOString()
    }

    return NextResponse.json({ contact: newContact })
  } catch (error: any) {
    console.error('CRM create contact error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to create contact' }, 
      { status: 500 }
    )
  }
}

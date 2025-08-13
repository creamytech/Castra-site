import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createDraft } from '@/lib/google/gmailLayer'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const to = body.to as string
  const subject = body.subject as string
  const html = body.html as string
  const draft = await createDraft(session.user.id, { to, subject, html })
  return NextResponse.json({ draft })
}



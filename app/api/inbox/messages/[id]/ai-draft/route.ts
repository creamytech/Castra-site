import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { summarizeLead } from '@/lib/agent/skills/summarizer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { goal = 'reply helpfully', tone = 'friendly' } = await request.json()

    const msg = await prisma.emailMessage.findFirst({ where: { id: params.id, userId: session.user.id } })
    const data = await summarizeLead({ goal, from: msg?.from, snippet: msg?.snippet })
    const draft = `(${tone}) ${data.summary}\n\n— Castra`
    return NextResponse.json({ draft })
  } catch (e: any) {
    console.error('[inbox ai-draft]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

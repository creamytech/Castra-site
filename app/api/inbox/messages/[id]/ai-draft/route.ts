import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { summarizeLead } from '@/lib/agent/skills/summarizer'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }, { params }: any) => {
  try {
    const { goal = 'reply helpfully', tone = 'friendly' } = await req.json()

    const msg = await prisma.emailMessage.findFirst({ where: { id: params.id, userId: ctx.session.user.id, orgId: ctx.orgId } })
    const data = await summarizeLead({ goal, from: msg?.from, snippet: msg?.snippet })
    const draft = `(${tone}) ${data.summary}\n\n— Castra`
    return NextResponse.json({ draft })
  } catch (e: any) {
    console.error('[inbox ai-draft]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.message.ai-draft' })

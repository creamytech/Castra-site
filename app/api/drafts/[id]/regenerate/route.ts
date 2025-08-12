import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { composeFollowup } from '@/src/ai/composeFollowup'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ ctx }, { params }: any) => {
  try {
    const id = params.id as string
    const draft = await prisma.draft.findFirst({ where: { id, userId: ctx.session.user.id }, include: { lead: { include: { user: true } } } })
    if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const lead = draft.lead as any
    const composed = await composeFollowup({ subject: lead.subject ?? lead.title ?? '', snippet: lead.bodySnippet ?? lead.description ?? '', fields: lead.attrs || {}, agent: { name: lead.user?.meta?.agentName, phone: lead.user?.phone }, schedule: lead.attrs?.schedule })
    await prisma.draft.update({ where: { id }, data: { subject: composed.subject, bodyText: composed.bodyText, proposedTimes: composed.proposedTimes as any } })
    return NextResponse.json({ ok: true, subject: composed.subject, bodyText: composed.bodyText })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'drafts.regenerate' })



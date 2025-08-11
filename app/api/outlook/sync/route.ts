import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { getOutlookAuthForUser, graphGet } from '@/lib/outlook/client'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  try {
    const { accessToken } = await getOutlookAuthForUser(ctx.session.user.id)
    const data = await graphGet<any>(accessToken, '/me/messages?$top=25')
    const messages = data.value || []
    for (const m of messages) {
      await prisma.emailMessage.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          threadId: m.conversationId || m.id,
          userId: ctx.session.user.id,
          orgId: ctx.orgId,
          from: m.from?.emailAddress?.address || '',
          to: (m.toRecipients || []).map((r: any)=>r.emailAddress?.address).filter(Boolean),
          cc: (m.ccRecipients || []).map((r: any)=>r.emailAddress?.address).filter(Boolean),
          date: new Date(m.receivedDateTime || m.sentDateTime || new Date().toISOString()),
          snippet: m.subject || '',
          bodyText: m.bodyPreview || null,
          internalRefs: m,
        },
        update: {
          snippet: m.subject || '',
          bodyText: m.bodyPreview || null,
          internalRefs: m,
        }
      })
    }
    const count = await prisma.emailMessage.count({ where: { userId: ctx.session.user.id, orgId: ctx.orgId } })
    return NextResponse.json({ success: true, synced: messages.length, total: count })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Outlook sync failed' }, { status: 500 })
  }
}, { action: 'outlook.sync' })



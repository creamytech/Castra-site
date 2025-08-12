import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { ids, action } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
    if (!['archive','read','star','trash'].includes(action)) return NextResponse.json({ error: 'invalid action' }, { status: 400 })

    const { oauth2 } = await getGoogleAuthForUser(ctx.session.user.id)
    const gmail = gmailClient(oauth2)
    const ops = ids.map(async (threadId: string) => {
      if (action === 'archive') {
        return gmail.users.threads.modify({ userId: 'me', id: threadId, requestBody: { removeLabelIds: ['INBOX'] } })
      }
      if (action === 'read') {
        return gmail.users.threads.modify({ userId: 'me', id: threadId, requestBody: { removeLabelIds: ['UNREAD'] } })
      }
      if (action === 'star') {
        return gmail.users.threads.modify({ userId: 'me', id: threadId, requestBody: { addLabelIds: ['STARRED'] } })
      }
      if (action === 'trash') {
        return gmail.users.threads.trash({ userId: 'me', id: threadId })
      }
    })
    await Promise.allSettled(ops)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[inbox threads bulk]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.threads.bulk' })



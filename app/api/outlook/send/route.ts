import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getOutlookAuthForUser, graphPost } from '@/lib/outlook/client'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const { to, subject, body } = await req.json()
    if (!to || !subject || !body) return NextResponse.json({ error: 'to, subject, body required' }, { status: 400 })
    const { accessToken } = await getOutlookAuthForUser(ctx.session.user.id)
    const res = await graphPost(accessToken, '/me/sendMail', {
      message: {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    })
    if (!res.ok) return NextResponse.json({ error: 'Outlook send failed', status: res.status, body: await res.text() }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'outlook.send' })



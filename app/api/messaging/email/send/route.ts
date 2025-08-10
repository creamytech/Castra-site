import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { to, subject, body, dealId, threadId } = await request.json()
    if (!to || !subject || !body) return NextResponse.json({ error: 'to, subject, body required' }, { status: 400 })

    const account = await prisma.account.findFirst({ where: { userId: session.user.id, provider: 'google' } })
    if (!account?.access_token) return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
    oauth2Client.setCredentials({ access_token: account.access_token, refresh_token: account.refresh_token })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const msg = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\n')
    const raw = Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const sent = await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId: threadId || undefined } })

    if (dealId) {
      await prisma.activity.create({ data: { dealId, userId: session.user.id, kind: 'EMAIL', channel: 'email', subject, body, meta: { to, threadId: sent.data.threadId, messageId: sent.data.id } } })
    }

    return NextResponse.json({ success: true, id: sent.data.id })
  } catch (e: any) {
    console.error('[messaging email send]', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

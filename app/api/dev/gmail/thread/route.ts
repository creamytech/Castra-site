import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { isFeatureEnabled } from '@/lib/config'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'
import { extractPlainAndHtml } from '@/lib/google'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    if (!isFeatureEnabled('gmail')) return NextResponse.json({ error: 'Gmail disabled' }, { status: 503 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { oauth2 } = await getGoogleAuthForUser(ctx.session.user.id)
    const gmail = gmailClient(oauth2)
    const thr = await gmail.users.threads.get({ userId: 'me', id, format: 'full' })
    const thread = thr.data
    const messages = (thread.messages || []).map(m => {
      const headers = (m.payload?.headers || []) as any[]
      const h = Object.fromEntries(headers.map((hh: any) => [hh.name.toLowerCase(), hh.value])) as any
      const { text, html } = extractPlainAndHtml(m.payload)
      return {
        id: m.id,
        threadId: m.threadId,
        from: h['from'] || '',
        to: (h['to'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        cc: (h['cc'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : h['date'] || null,
        snippet: m.snippet || '',
        bodyText: text || null,
      }
    })
    return NextResponse.json({ thread: { id: thread.id, messages } })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (/insufficientPermissions|forbidden/i.test(msg)) {
      return NextResponse.json({ error: 'MISSING_SCOPE', scope: 'gmail.readonly' }, { status: 403 })
    }
    if (/invalid_grant|unauthorized_client|invalid_token/i.test(msg)) {
      return NextResponse.json({ error: 'INVALID_TOKENS', reconnect: true }, { status: 401 })
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}, { action: 'dev.gmail.thread' })



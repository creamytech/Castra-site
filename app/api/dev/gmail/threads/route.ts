import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getGoogleClientsForUser } from '@/lib/google/getClient'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx, req }) => {
  const { gmail } = await getGoogleClientsForUser(ctx.session.user.id)
  const { searchParams } = new URL(req.url)
  const max = Number(searchParams.get('max') ?? 10)
  const list = await gmail.users.threads.list({ userId: 'me', maxResults: max, q: 'in:anywhere newer_than:7d' })
  const threads = await Promise.all((list.data.threads || []).map(async (t) => {
    const full = await gmail.users.threads.get({ userId: 'me', id: t.id! })
    const messages = full.data.messages || []
    const last = messages[messages.length - 1]
    const headers = Object.fromEntries((last?.payload?.headers || []).map(h => [h.name!, h.value || ''])) as Record<string,string>
    const subject = headers['Subject'] || ''
    const from = headers['From'] || ''
    const snippet = last?.snippet || ''
    return { id: t.id, subject, from, snippet, messageCount: messages.length }
  }))
  return NextResponse.json({ threads })
}, { action: 'dev.gmail.threads' })

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const max = Math.min(Number(searchParams.get('max') || 20), 50)
    const { oauth2 } = await getGoogleAuthForUser(ctx.session.user.id)
    const gmail = gmailClient(oauth2)
    const list = await gmail.users.threads.list({ userId: 'me', q, maxResults: max })
    const threads = await Promise.all((list.data.threads || []).slice(0, max).map(async (t) => {
      try {
        const full = await gmail.users.threads.get({ userId: 'me', id: t!.id!, format: 'full' })
        const last = full.data.messages?.slice(-1)?.[0]
        const headers = (last?.payload?.headers || []) as any[]
        const h = Object.fromEntries(headers.map((hh: any) => [hh.name.toLowerCase(), hh.value])) as any
        const subject = h['subject'] || ''
        const from = h['from'] || ''
        const m = from.match(/^(.*?)(<([^>]+)>)?$/)
        const fromName = m ? (m[1] || '').trim().replace(/"/g, '') : ''
        const fromEmail = m ? (m[3] || '').trim() : ''
        const date = last?.internalDate ? new Date(Number(last.internalDate)).toISOString() : (h['date'] || null)
        return { id: t!.id, subject, snippet: last?.snippet || '', fromName, fromEmail, date }
      } catch {
        return { id: t!.id }
      }
    }))
    return NextResponse.json({ threads })
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
}, { action: 'dev.gmail.threads' })



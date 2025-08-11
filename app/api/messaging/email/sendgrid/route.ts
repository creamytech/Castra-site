import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const key = process.env.SENDGRID_API_KEY
    if (!key) return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 })
    const { to, subject, html, text } = await req.json()
    if (!to || !subject || (!html && !text)) return NextResponse.json({ error: 'to, subject, and html or text required' }, { status: 400 })
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.SENDGRID_FROM || 'noreply@castra.ai' },
        subject,
        content: [{ type: html ? 'text/html' : 'text/plain', value: html || text }]
      })
    })
    if (!res.ok) return NextResponse.json({ error: 'SendGrid send failed', status: res.status, body: await res.text() }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}, { action: 'sendgrid.send' })



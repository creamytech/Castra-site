import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  if (action === 'reconnect') {
    const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || 'http://localhost:3000'
    return NextResponse.redirect(`${base}/api/auth/signin?provider=google`)
  }
  return NextResponse.json({ ok: true })
}



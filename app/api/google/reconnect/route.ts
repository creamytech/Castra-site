import { NextResponse } from 'next/server'

export async function GET() {
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || 'http://localhost:3000'
  const url = `${base}/api/auth/signin?provider=google`
  return NextResponse.redirect(url)
}



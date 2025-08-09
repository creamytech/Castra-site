import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const testInfo = {
    timestamp: new Date().toISOString(),
    providers: authOptions.providers.map((p: any) => p.id),
    adapter: authOptions.adapter ? 'ENABLED' : 'DISABLED',
    debug: authOptions.debug,
    sessionStrategy: authOptions.session?.strategy,
  }

  return NextResponse.json(testInfo)
}

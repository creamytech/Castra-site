import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getThread } from '@/lib/google/gmailLayer'
import { cacheGet, cacheSet } from '@/lib/cache'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = `bundle:${session.user.id}:${params.id}`
  const cached = await cacheGet<any>(key)
  if (cached) return NextResponse.json(cached)
  const thread = await getThread(session.user.id, params.id)
  const payload = { thread, lead: null, deal: null }
  await cacheSet(key, payload, 60)
  return NextResponse.json(payload)
}



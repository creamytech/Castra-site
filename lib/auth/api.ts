import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/require'
import { prisma as prismaApp } from '@/lib/prisma'
import { prisma as prismaSecure } from '@/lib/securePrisma'
import { logAudit } from '@/lib/audit/log'

export type ApiHandler = (
  args: { req: NextRequest; ctx: { session: any; orgId: string; role: any } },
  routeCtx?: any
) => Promise<NextResponse | Response>

export function withAuth(handler: ApiHandler, options?: { action?: string }) {
  return async function(request: NextRequest, routeCtx?: any) {
    try {
      const ctx = await requireSession()
      // Set RLS user id for this request scope (best-effort)
      try {
        if (ctx?.session?.user?.id) {
          await prismaApp.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, ctx.session.user.id)
          await prismaSecure.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, ctx.session.user.id)
        }
      } catch {}
      const res = await handler({ req: request, ctx }, routeCtx)
      if (options?.action) {
        await logAudit({ orgId: ctx.orgId, userId: ctx.session.user.id, action: options.action, target: request.nextUrl.pathname, ip: request.headers.get('x-forwarded-for') || undefined, ua: request.headers.get('user-agent') || undefined })
      }
      return res
    } catch (e: any) {
      const status = e?.status || 401
      return NextResponse.json({ error: e?.message || 'Unauthorized' }, { status })
    }
  }
}



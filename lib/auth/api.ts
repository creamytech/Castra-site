import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/require'
import { logAudit } from '@/lib/audit/log'

export type ApiHandler = (
  args: { req: NextRequest; ctx: { session: any; orgId: string; role: any } },
  routeCtx?: any
) => Promise<NextResponse>

export function withAuth(handler: ApiHandler, options?: { action?: string }) {
  return async function(request: NextRequest, routeCtx?: any) {
    try {
      const ctx = await requireSession()
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



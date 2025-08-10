import { prisma } from '@/lib/prisma'

export async function logAudit(params: { orgId: string; userId?: string | null; action: string; target?: string; meta?: any; ip?: string; ua?: string }) {
  try {
    await prisma.auditLog.create({ data: { orgId: params.orgId, userId: params.userId || null, action: params.action, target: params.target, meta: params.meta || null, ip: params.ip, ua: params.ua } })
  } catch {}
}



import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type LoadedContext = { session: any; orgId: string; role: 'OWNER'|'ADMIN'|'MANAGER'|'AGENT'|'VIEWER' }

export async function requireSession(): Promise<LoadedContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  const member = await prisma.orgMember.findFirst({ where: { userId: session.user.id }, include: { org: true } })
  if (!member?.orgId) throw new Error('No organization')
  return { session, orgId: member.orgId, role: member.role as any }
}

export async function requireRole(orgId: string, userId: string, allowed: LoadedContext['role'][]): Promise<boolean> {
  const member = await prisma.orgMember.findFirst({ where: { orgId, userId } })
  return !!member && allowed.includes(member.role as any)
}



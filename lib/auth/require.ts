import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type LoadedContext = { session: any; orgId: string; role: 'OWNER'|'ADMIN'|'MANAGER'|'AGENT'|'VIEWER' }

export async function requireSession(): Promise<LoadedContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Unauthorized')
  let member = await prisma.orgMember.findFirst({ where: { userId: session.user.id }, include: { org: true } })
  if (!member?.orgId) {
    // Auto-provision a default organization for first-time users
    const orgName = session.user.name || session.user.email || 'My Organization'
    const [org, m] = await prisma.$transaction([
      prisma.org.create({ data: { name: orgName } }),
      // Placeholder; member will be created after org id is known in a second step
    ]) as any
    const createdMember = await prisma.orgMember.create({ data: { orgId: org.id, userId: session.user.id, role: 'OWNER' as any } })
    const created = { org, m: createdMember }
    member = { ...created.m, org: created.org } as any
  }
  const ensured = member as unknown as { orgId: string; role: any }
  return { session, orgId: ensured.orgId, role: ensured.role as any }
}

export async function requireRole(orgId: string, userId: string, allowed: LoadedContext['role'][]): Promise<boolean> {
  const member = await prisma.orgMember.findFirst({ where: { orgId, userId } })
  return !!member && allowed.includes(member.role as any)
}



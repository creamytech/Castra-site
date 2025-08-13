import { prisma } from '@/lib/securePrisma'

export async function ensureOrgAndMembership(tx: typeof prisma, userId: string): Promise<string> {
  const existing = await (tx as any).orgMember.findFirst({ where: { userId }, select: { orgId: true } })
  if (existing?.orgId) return existing.orgId

  const org = await (tx as any).org.create({ data: { name: 'My Workspace' }, select: { id: true } })
  await (tx as any).orgMember.create({ data: { userId, orgId: org.id, role: 'OWNER' } })
  return org.id
}



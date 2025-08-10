import { prisma } from '@/lib/prisma'

export async function getSessionContext(userId: string) {
  const [deals, policy, profile] = await Promise.all([
    prisma.deal.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 10, include: { leadPreference: true } }),
    prisma.autonomyPolicy.findMany({ where: { userId } }),
    prisma.userProfile.findFirst({ where: { userId } })
  ])
  return {
    deals: deals.map(d => ({ id: d.id, title: d.title, stage: d.stage, type: d.type, city: d.city, priceTarget: d.priceTarget, leadPreference: d.leadPreference })),
    autonomyPolicies: policy,
    styleGuide: profile?.styleGuide || null,
  }
}

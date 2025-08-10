import { prisma } from '@/lib/prisma'

export async function getSessionContext(userId: string) {
  const [deals, policy] = await Promise.all([
    prisma.deal.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 10, include: { leadPreference: true } }),
    prisma.autonomyPolicy.findMany({ where: { userId } })
  ])
  let profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) {
    profile = await prisma.userProfile.create({ data: { userId, displayName: undefined, styleGuide: { tone: 'friendly', formality: 4, emojis: false, phrases: [], sentenceLength: 'medium', description: 'Concise, helpful real estate tone.' }, voice: 'verse', hotwordOn: true } })
  }
  return {
    deals: deals.map(d => ({ id: d.id, title: d.title, stage: d.stage, type: d.type, city: d.city, priceTarget: d.priceTarget, leadPreference: d.leadPreference })),
    autonomyPolicies: policy,
    styleGuide: profile?.styleGuide || null,
    voice: profile?.voice || 'verse',
  }
}

// @ts-ignore
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getOrgIdForUser(userId: string): Promise<string | null> {
  const member = await prisma.orgMember.findFirst({ where: { userId }, select: { orgId: true } })
  return member?.orgId ?? null
}

async function main() {
  let processed = 0
  while (true) {
    const items = await prisma.activity.findMany({ where: { orgId: null }, select: { id: true, dealId: true, userId: true }, take: 200 })
    if (items.length === 0) break
    for (const a of items) {
      let orgId: string | null = null
      if (a.dealId) {
        const d = await prisma.deal.findUnique({ where: { id: a.dealId }, select: { orgId: true } })
        orgId = d?.orgId ?? null
      }
      if (!orgId) {
        orgId = await getOrgIdForUser(a.userId)
      }
      if (orgId) {
        await prisma.activity.update({ where: { id: a.id }, data: { orgId } })
        processed++
      }
    }
    if (items.length < 200) break
  }
  console.log('Backfilled Activity.orgId rows:', processed)
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })



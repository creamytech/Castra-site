import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const email = 'demo@castra.dev'
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Demo User' },
    update: {}
  })
  await prisma.$transaction(async (tx) => {
    const org = await tx.org.create({ data: { name: 'Demo Org' } })
    await tx.orgMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
      create: { orgId: org.id, userId: user.id, role: 'OWNER' as any },
      update: {}
    })
  })
  console.log('Seed OK', { user: user.email })
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); process.exit(1) })



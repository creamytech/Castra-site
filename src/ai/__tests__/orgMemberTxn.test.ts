import { PrismaClient } from '@prisma/client'

describe('Org/OrgMember transaction', () => {
  it('creates org then member without FK error', async () => {
    const prisma = new PrismaClient()
    const email = `test-${Date.now()}@example.com`
    const user = await prisma.user.create({ data: { email } })
    await expect(prisma.$transaction(async (tx) => {
      const org = await tx.org.create({ data: { name: 'Txn Org' } })
      await tx.orgMember.create({ data: { orgId: org.id, userId: user.id, role: 'OWNER' as any } })
    })).resolves.not.toThrow()
    await prisma.$disconnect()
  })
})



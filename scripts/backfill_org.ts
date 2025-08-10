// @ts-ignore - compiled with ts-node transpile-only
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } })
  for (const user of users) {
    let member = await prisma.orgMember.findFirst({ where: { userId: user.id } })
    if (!member) {
      const org = await prisma.org.create({ data: { name: (user.name || user.email || 'Org') + '' } })
      member = await prisma.orgMember.create({ data: { orgId: org.id, userId: user.id, role: 'OWNER' } })
    }
    const orgId = member.orgId
    // Stamp orgId on business rows missing it
    await prisma.$transaction([
      prisma.deal.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.contact.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.lead.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.activity.updateMany({ where: { userId: user.id }, data: {} }), // no orgId on Activity model
      prisma.emailThread.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.emailMessage.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.autonomyPolicy.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.task.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.interaction.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.userProfile.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.template.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.toneEmbedding.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.smartReply.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.notification.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
      prisma.eventSuggestion.updateMany({ where: { userId: user.id, OR: [{ orgId: null }, { orgId: undefined as any }] }, data: { orgId } }),
    ])
  }
}

main().then(()=>{
  console.log('Backfill complete')
}).catch(e=>{
  console.error(e)
  process.exit(1)
}).finally(async()=>{
  await prisma.$disconnect()
})



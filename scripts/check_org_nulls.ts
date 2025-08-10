// @ts-ignore
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const checks: Array<[string, number]> = []
  checks.push(['Deal', await prisma.deal.count({ where: { orgId: null } })])
  checks.push(['Contact', await prisma.contact.count({ where: { orgId: null } })])
  checks.push(['Lead', await prisma.lead.count({ where: { orgId: null } })])
  checks.push(['EmailThread', await prisma.emailThread.count({ where: { orgId: null } })])
  checks.push(['EmailMessage', await prisma.emailMessage.count({ where: { orgId: null } })])
  checks.push(['Task', await prisma.task.count({ where: { orgId: null } })])
  checks.push(['Interaction', await prisma.interaction.count({ where: { orgId: null } })])
  checks.push(['UserProfile', await prisma.userProfile.count({ where: { orgId: null } })])
  checks.push(['Template', await prisma.template.count({ where: { orgId: null } })])
  checks.push(['ToneEmbedding', await prisma.toneEmbedding.count({ where: { orgId: null } })])
  checks.push(['SmartReply', await prisma.smartReply.count({ where: { orgId: null } })])
  checks.push(['Notification', await prisma.notification.count({ where: { orgId: null } })])
  checks.push(['EventSuggestion', await prisma.eventSuggestion.count({ where: { orgId: null } })])
  checks.push(['AutonomyPolicy', await prisma.autonomyPolicy.count({ where: { orgId: null } })])
  checks.push(['Activity', await prisma.activity.count({ where: { orgId: null } })])

  console.table(checks.map(([t, c]) => ({ table: t, nullOrgRows: c })))
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1) })



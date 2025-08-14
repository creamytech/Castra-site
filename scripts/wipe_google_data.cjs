// Standalone wipe script using PrismaClient directly (CommonJS)
const { PrismaClient } = require('@prisma/client')

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!databaseUrl) {
  console.error('DATABASE_URL or POSTGRES_URL must be set to run this script')
  process.exit(1)
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })

async function main() {
  const provider = process.argv[2] || 'google'
  if (!['google', 'azure-ad'].includes(provider)) {
    console.error('Usage: node scripts/wipe_google_data.cjs [google|azure-ad]')
    process.exit(1)
  }

  console.log('Wiping provider data:', provider)

  // Delete provider-specific accounts
  try {
    const a = await prisma.account.deleteMany({ where: { provider } })
    console.log('Deleted accounts:', a.count)
  } catch (e) {
    console.warn('Account delete failed (may not exist):', e?.message)
  }

  // Email/log related data
  const steps = [
    { name: 'email logs', fn: () => prisma.emailLog.deleteMany({}) },
    { name: 'email messages', fn: () => prisma.emailMessage.deleteMany({}) },
    { name: 'email threads', fn: () => prisma.emailThread.deleteMany({}) },
    { name: 'legacy messages', fn: () => prisma.message.deleteMany({}) },
    { name: 'email thread cache', fn: () => prisma.emailThreadCache.deleteMany({}) },
    { name: 'smart replies', fn: () => prisma.smartReply.deleteMany({}) },
    { name: 'event suggestions', fn: () => prisma.eventSuggestion.deleteMany({}) },
  ]

  for (const step of steps) {
    try {
      const res = await step.fn()
      console.log('Deleted', step.name + ':', res.count)
    } catch (e) {
      console.warn('Delete failed for', step.name, '-', e?.message)
    }
  }

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



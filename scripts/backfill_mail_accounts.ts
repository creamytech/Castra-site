// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { encryptRefreshToken } = require('../lib/token')

const prisma = new PrismaClient()

async function run() {
  const accounts = await prisma.account.findMany({ where: { provider: 'google' }, select: { id: true, userId: true, providerAccountId: true, refresh_token: true } })
  let created = 0, updated = 0
  for (const a of accounts) {
    try {
      const enc = a.refresh_token ? await encryptRefreshToken(a.refresh_token) : Buffer.alloc(0)
      const res = await prisma.mailAccount.upsert({
        where: { providerUserId: a.providerAccountId },
        create: { userId: a.userId, provider: 'google', providerUserId: a.providerAccountId, refreshTokenEnc: enc },
        update: { userId: a.userId, refreshTokenEnc: enc }
      })
      if (res) (a.refresh_token ? created++ : updated++)
    } catch (e) {
      console.error('backfill error', a.id, e)
    }
  }
  console.log('backfill complete', { rows: accounts.length, created, updated })
}

run().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1) })



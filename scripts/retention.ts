import { prisma } from '@/lib/securePrisma'
import { deleteObject } from '@/lib/storage'

const RETAIN_DAYS = parseInt(process.env.RETENTION_DAYS || '365', 10)

async function run() {
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 24 * 3600 * 1000)
  const old = await prisma.secureMessage.findMany({ where: { receivedAt: { lt: cutoff }, bodyRef: { not: null } }, select: { id: true, bodyRef: true } })
  for (const m of old) {
    try {
      const objectKey = m.bodyRef!
      await deleteObject(objectKey)
      await prisma.secureMessage.update({ where: { id: m.id }, data: { bodyRef: null } })
    } catch {}
  }
}

run().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1) })



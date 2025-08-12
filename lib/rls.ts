import { prisma } from '@/lib/securePrisma'

export async function withRLS<T>(userId: string, fn: (tx: typeof prisma) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await (tx as any).$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, userId)
    return fn(tx as any)
  })
}



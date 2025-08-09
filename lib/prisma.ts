import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only create Prisma client if DATABASE_URL is provided
export const prisma = process.env.DATABASE_URL 
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : undefined

if (process.env.NODE_ENV !== 'production' && prisma) globalForPrisma.prisma = prisma

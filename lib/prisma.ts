import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

// Ensure Prisma has a DATABASE_URL. Some platforms expose only POSTGRES_URL.
if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('DATABASE_URL (or POSTGRES_URL) is required');
  }
  const base = new PrismaClient({ datasources: { db: { url } } });
  if (process.env.OPTIMIZE_API_KEY) {
    return base.$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY })) as unknown as PrismaClient;
  }
  return base;
}

function createLazyPrisma(): PrismaClient {
  let instance: PrismaClient | null = null;
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (!instance) {
        if (!process.env.DATABASE_URL) {
          throw new Error("DATABASE_URL is not set. Provide it at runtime; avoid DB access during build.");
        }
        instance = createClient();
      }
      return (instance as any)[prop];
    },
    apply(_target, _thisArg, argArray) {
      if (!instance) {
        if (!process.env.DATABASE_URL) {
          throw new Error("DATABASE_URL is not set. Provide it at runtime; avoid DB access during build.");
        }
        instance = createClient();
      }
      return (instance as any).apply?.(instance, argArray);
    },
  };
  return new Proxy(function () {} as any, handler) as unknown as PrismaClient;
}

const prismaClient: PrismaClient = (globalForPrisma.prisma as PrismaClient) ?? createLazyPrisma();
export const prisma: PrismaClient = prismaClient;

if (process.env.NODE_ENV !== "production") (globalForPrisma as any).prisma = prisma as any;

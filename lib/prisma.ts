import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const base = new PrismaClient();
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

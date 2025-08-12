import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const base = new PrismaClient();
// Attach Optimize extension when API key is present
const client = process.env.OPTIMIZE_API_KEY
  ? (base.$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY })) as unknown as PrismaClient)
  : base;

export const prisma: PrismaClient = (globalForPrisma.prisma as PrismaClient) ?? client;

if (process.env.NODE_ENV !== "production") (globalForPrisma as any).prisma = prisma as any;

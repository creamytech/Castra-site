import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const base = new PrismaClient();
// Attach Optimize extension when API key is present
export const prisma = globalForPrisma.prisma ?? (
  process.env.OPTIMIZE_API_KEY
    ? base.$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY }))
    : base
);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

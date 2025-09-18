import { PrismaClient } from "@repo/database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"], // or ['query', 'info', 'warn', 'error'] if debugging
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

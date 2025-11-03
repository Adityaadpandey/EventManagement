import { PrismaClient } from "@repo/database";
import { config } from ".";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
    // Performance optimizations
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

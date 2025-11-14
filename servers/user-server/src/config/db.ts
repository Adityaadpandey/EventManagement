import { PrismaClient } from "@repo/database";
import { config } from ".";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    errorFormat: config.NODE_ENV === "production" ? "minimal" : "pretty",
    // Performance optimizations
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown for Prisma
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@repo/database";
import { config } from ".";

const connectionString = `${config.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
// Graceful shutdown for Prisma
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
